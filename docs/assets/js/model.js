// Match-outcome model: time-weighted Dixon–Coles Poisson with ridge priors,
// optional club home advantage / shots-on-target blending, and Monte Carlo season simulation.
// Pure functions only — runs in the browser (Web Worker) and in Node (scripts/backtest.mjs).

const DAY = 86400000;
const MAX_GOALS = 10;

export const DEFAULTS = {
  xi: 0.0012,        // time-decay per day (weight = exp(-xi * age)); tuned by scripts/backtest.mjs
  ridge: 10,         // prior strength pulling team ratings toward their prior
  homeRidge: 15,     // >0 enables club-specific home advantage with this shrinkage
  shotBlend: 0,      // share of target taken from shots-on-target "expected goals"
  sotValue: 0.30,    // goals per shot on target (refitted from data when available)
  promotedPrior: -0.18, // prior strength for teams with no top-flight history
  sweeps: 40,
};

// matches: [{date, h, a, hg, ag, hst?, ast?, done}] — ids are strings
export function fitModel(matches, asOf, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const known = opts.knownTeams || null; // Set of teams with top-flight history
  const t0 = typeof asOf === 'number' ? asOf : Date.parse(asOf);
  const data = [];
  let sotGoals = 0, sotShots = 0;
  for (const m of matches) {
    if (!m.done) continue;
    const t = Date.parse(m.date);
    if (!(t < t0)) continue;
    const w = Math.exp(-o.xi * (t0 - t) / DAY);
    if (w < 1e-3) continue;
    if (m.hst != null && m.ast != null) { sotGoals += m.hg + m.ag; sotShots += m.hst + m.ast; }
    data.push({ m, w });
  }
  const sotValue = sotShots > 200 ? sotGoals / sotShots : o.sotValue;
  const teams = new Map();
  const team = id => {
    if (!teams.has(id)) {
      const prior = known && !known.has(id) ? o.promotedPrior : 0;
      teams.set(id, { att: prior / 2, def: prior / 2, ha: 0, pa: prior / 2, pd: prior / 2, n: 0, hA: 0, hD: 0 });
    }
    return teams.get(id);
  };
  const rows = data.map(({ m, w }) => {
    const sb = m.hst != null && m.ast != null ? o.shotBlend : 0;
    return {
      h: team(m.h), a: team(m.a), w,
      yh: (1 - sb) * m.hg + sb * m.hst * sotValue,
      ya: (1 - sb) * m.ag + sb * m.ast * sotValue,
      hg: m.hg, ag: m.ag,
    };
  });
  for (const r of rows) { r.h.n += r.w; r.a.n += r.w; }

  // Block-coordinate Newton: within each block the Hessian is diagonal, so every step is exact.
  let mu = 0.1, home = 0.25;
  const T = [...teams.values()];
  const pass = fn => {
    for (const t of T) { t.g = 0; t.hs = 0; }
    let g0 = 0, h0 = 0, g1 = 0, h1 = 0;
    for (const r of rows) {
      const lh = Math.exp(mu + home + r.h.ha + r.h.att - r.a.def), la = Math.exp(mu + r.a.att - r.h.def);
      const eh = r.w * (r.yh - lh), ea = r.w * (r.ya - la);
      if (fn === 'att') { r.h.g += eh; r.h.hs += r.w * lh; r.a.g += ea; r.a.hs += r.w * la; }
      else if (fn === 'def') { r.a.g -= eh; r.a.hs += r.w * lh; r.h.g -= ea; r.h.hs += r.w * la; }
      else if (fn === 'ha') { r.h.g += eh; r.h.hs += r.w * lh; }
      else { g0 += eh + ea; h0 += r.w * (lh + la); g1 += eh; h1 += r.w * lh; }
    }
    return [g0, h0, g1, h1];
  };
  for (let s = 0; s < o.sweeps; s++) {
    pass('att');
    for (const t of T) { t.att += (t.g - o.ridge * (t.att - t.pa)) / (t.hs + o.ridge); t.hA = t.hs; }
    pass('def');
    for (const t of T) { t.def += (t.g - o.ridge * (t.def - t.pd)) / (t.hs + o.ridge); t.hD = t.hs; }
    let [g0, h0] = pass('mu');
    if (h0 > 0) mu += g0 / h0;
    const [, , g1, h1] = pass('home');
    if (h1 > 0) home += (g1 - 2 * (home - 0.25)) / (h1 + 2);
    if (o.homeRidge > 0) {
      pass('ha');
      for (const t of T) t.ha += (t.g - o.homeRidge * t.ha) / (t.hs + o.homeRidge);
    }
  }
  // Posterior spread (Laplace approximation) for parameter uncertainty in simulations.
  for (const t of teams.values()) {
    t.sdA = 1 / Math.sqrt(t.hA + o.ridge);
    t.sdD = 1 / Math.sqrt(t.hD + o.ridge);
  }
  const rho = fitRho(rows, mu, home);
  const out = { mu, home, rho, sotValue, teams: {}, asOf: t0, n: rows.length };
  for (const [id, t] of teams) out.teams[id] = { att: t.att, def: t.def, ha: t.ha, sdA: t.sdA, sdD: t.sdD, n: t.n };
  return out;
}

function tau(x, y, lh, la, rho) {
  if (x === 0 && y === 0) return 1 - lh * la * rho;
  if (x === 0 && y === 1) return 1 + lh * rho;
  if (x === 1 && y === 0) return 1 + la * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

function fitRho(rows, mu, home) {
  let best = 0, bestLL = -Infinity;
  for (let rho = -0.2; rho <= 0.1001; rho += 0.01) {
    let ll = 0;
    for (const r of rows) {
      if (r.hg > 1 || r.ag > 1) continue;
      const lh = Math.exp(mu + home + r.h.ha + r.h.att - r.a.def), la = Math.exp(mu + r.a.att - r.h.def);
      const tv = tau(r.hg, r.ag, lh, la, rho);
      if (tv <= 0) { ll = -Infinity; break; }
      ll += r.w * Math.log(tv);
    }
    if (ll > bestLL) { bestLL = ll; best = rho; }
  }
  return +best.toFixed(2);
}

function rating(model, id) {
  return model.teams[id] || { att: DEFAULTS.promotedPrior / 2, def: DEFAULTS.promotedPrior / 2, ha: 0, sdA: 0.2, sdD: 0.2 };
}

export function expectedGoals(model, h, a, neutral = false) {
  const H = rating(model, h), A = rating(model, a);
  return {
    lh: Math.exp(model.mu + (neutral ? 0 : model.home + H.ha) + H.att - A.def),
    la: Math.exp(model.mu + A.att - H.def),
  };
}

function poissonPmf(l) {
  const p = new Float64Array(MAX_GOALS + 1);
  p[0] = Math.exp(-l);
  for (let k = 1; k <= MAX_GOALS; k++) p[k] = p[k - 1] * l / k;
  return p;
}

export function scoreMatrix(lh, la, rho) {
  const ph = poissonPmf(lh), pa = poissonPmf(la);
  const M = [];
  let sum = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    M.push(new Float64Array(MAX_GOALS + 1));
    for (let y = 0; y <= MAX_GOALS; y++) {
      const v = ph[x] * pa[y] * tau(x, y, lh, la, rho);
      M[x][y] = v; sum += v;
    }
  }
  for (const row of M) for (let y = 0; y <= MAX_GOALS; y++) row[y] /= sum;
  return M;
}

export function predictMatch(model, h, a, neutral = false) {
  const { lh, la } = expectedGoals(model, h, a, neutral);
  const M = scoreMatrix(lh, la, model.rho);
  let pH = 0, pD = 0, pA = 0, over25 = 0, btts = 0;
  const scores = [];
  for (let x = 0; x <= MAX_GOALS; x++) for (let y = 0; y <= MAX_GOALS; y++) {
    const p = M[x][y];
    if (x > y) pH += p; else if (x === y) pD += p; else pA += p;
    if (x + y > 2) over25 += p;
    if (x > 0 && y > 0) btts += p;
    if (x <= 5 && y <= 5) scores.push({ h: x, a: y, p });
  }
  scores.sort((u, v) => v.p - u.p);
  return { lh, la, pH, pD, pA, over25, btts, top: scores.slice(0, 6), matrix: M };
}

// In-play: remaining goals ~ Poisson(rate × time left), added to the current score.
// Goal rates rise late in matches; the 1.1 factor reflects that and stoppage time.
export function predictLive(model, h, a, hg, ag, minute, neutral = false) {
  const { lh, la } = expectedGoals(model, h, a, neutral);
  const left = Math.max(0, Math.min(1, (93 - Math.min(minute ?? 0, 93)) / 93)) * 1.1;
  const M = scoreMatrix(lh * left + 1e-9, la * left + 1e-9, 0);
  let pH = 0, pD = 0, pA = 0;
  for (let x = 0; x <= MAX_GOALS; x++) for (let y = 0; y <= MAX_GOALS; y++) {
    const p = M[x][y], fh = hg + x, fa = ag + y;
    if (fh > fa) pH += p; else if (fh === fa) pD += p; else pA += p;
  }
  return { pH, pD, pA, lhLeft: lh * left, laLeft: la * left };
}

// Ranked probability score for 1X2 (lower is better).
export function rps(p, outcome) {
  const o = [outcome === 'H' ? 1 : 0, outcome === 'D' ? 1 : 0, outcome === 'A' ? 1 : 0];
  const c1 = p[0] - o[0], c2 = p[0] + p[1] - o[0] - o[1];
  return (c1 * c1 + c2 * c2) / 2;
}

// Walk-forward backtest: refit before each matchday window, predict the next window.
export function backtest(matches, startDate, endDate, opts = {}, stepDays = 7) {
  const s = Date.parse(startDate), e = Date.parse(endDate);
  const done = matches.filter(m => m.done).sort((u, v) => Date.parse(u.date) - Date.parse(v.date));
  let n = 0, sRps = 0, sLL = 0, sBrier = 0, hits = 0;
  const bins = Array.from({ length: 10 }, () => ({ p: 0, o: 0, n: 0 }));
  for (let t = s; t < e; t += stepDays * DAY) {
    const win = done.filter(m => { const d = Date.parse(m.date); return d >= t && d < t + stepDays * DAY && d < e; });
    if (!win.length) continue;
    const model = fitModel(done, t, opts);
    for (const m of win) {
      const p = predictMatch(model, m.h, m.a);
      const out = m.hg > m.ag ? 'H' : m.hg === m.ag ? 'D' : 'A';
      const v = [p.pH, p.pD, p.pA], oi = 'HDA'.indexOf(out);
      sRps += rps(v, out);
      sLL -= Math.log(Math.max(v[oi], 1e-9));
      sBrier += v.reduce((acc, q, i) => acc + (q - (i === oi ? 1 : 0)) ** 2, 0);
      if (v.indexOf(Math.max(...v)) === oi) hits++;
      v.forEach((q, i) => { const b = bins[Math.min(9, Math.floor(q * 10))]; b.p += q; b.o += i === oi ? 1 : 0; b.n++; });
      n++;
    }
  }
  return {
    n, rps: sRps / n, logLoss: sLL / n, brier: sBrier / n, accuracy: hits / n,
    calibration: bins.filter(b => b.n >= 5).map(b => ({ pred: b.p / b.n, obs: b.o / b.n, n: b.n })),
  };
}

// Mulberry32 PRNG — deterministic per seed so results don't flicker between refreshes.
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

function samplePoisson(l, r) {
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}

// Exact Dixon–Coles sampling: rejection on tau, which only rescales the four low scores.
function sampleScore(lh, la, rho, r) {
  const tmax = Math.max(1, 1 - lh * la * rho, 1 + lh * rho, 1 + la * rho, 1 - rho);
  for (;;) {
    const x = samplePoisson(lh, r), y = samplePoisson(la, r);
    if (r() * tmax <= tau(x, y, lh, la, rho)) return [x, y];
  }
}

// table: [{id, pts, w, gd, gf, gp}], fixtures: [{h, a, date}]
// Returns per-team position distributions, expected final points and per-round points trajectories.
export function simulateSeason(model, table, fixtures, { sims = 10000, seed = 7, track = [], safetyRank = 0 } = {}) {
  const r = rng(seed);
  const ids = table.map(t => t.id), N = ids.length, idx = new Map(ids.map((id, i) => [id, i]));
  const posCount = ids.map(() => new Float64Array(N));
  const ptsSum = new Float64Array(N);
  const safety = []; // final points of the last team above the drop zone, per simulation
  const fx = [...fixtures].sort((u, v) => Date.parse(u.date) - Date.parse(v.date))
    .filter(f => idx.has(f.h) && idx.has(f.a));
  const trackIdx = track.filter(id => idx.has(id)).map(id => idx.get(id));
  // traj[team][k] = points samples after k-th own remaining match
  const traj = Object.fromEntries(track.map(id => [id, []]));
  // Conditional outlook: final positions split by the result of each tracked club's next match.
  const firstFx = trackIdx.map(ti => fx.findIndex(f => idx.get(f.h) === ti || idx.get(f.a) === ti));
  const cond = trackIdx.map(() => ({ W: new Float64Array(N), D: new Float64Array(N), L: new Float64Array(N) }));
  const nextRes = trackIdx.map(() => 'D');
  const above = trackIdx.map(() => new Float64Array(trackIdx.length)); // above[i][j]: i finishes above j
  const pts = new Float64Array(N), w = new Float64Array(N), gd = new Float64Array(N), gf = new Float64Array(N);
  const att = new Float64Array(N), def = new Float64Array(N), ha = new Float64Array(N);
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < N; i++) {
      const t = table[i], R = rating(model, t.id);
      pts[i] = t.pts; w[i] = t.w; gd[i] = t.gd; gf[i] = t.gf;
      att[i] = R.att + gauss(r) * R.sdA * 0.7;
      def[i] = R.def + gauss(r) * R.sdD * 0.7;
      ha[i] = R.ha || 0;
    }
    const seq = trackIdx.map(() => []);
    for (let fi = 0; fi < fx.length; fi++) {
      const f = fx[fi];
      const hi = idx.get(f.h), ai = idx.get(f.a);
      const lh = Math.exp(model.mu + model.home + ha[hi] + att[hi] - def[ai]);
      const la = Math.exp(model.mu + att[ai] - def[hi]);
      let x, y;
      if (f.state === 'in' && f.hg != null) {
        // Live match: only the minutes left are simulated, on top of the current score.
        const left = Math.max(0, (93 - Math.min(f.minute ?? 0, 93)) / 93) * 1.1;
        x = f.hg + samplePoisson(lh * left, r); y = f.ag + samplePoisson(la * left, r);
      } else [x, y] = sampleScore(lh, la, model.rho, r);
      if (x > y) { pts[hi] += 3; w[hi]++; } else if (x < y) { pts[ai] += 3; w[ai]++; } else { pts[hi]++; pts[ai]++; }
      gd[hi] += x - y; gd[ai] += y - x; gf[hi] += x; gf[ai] += y;
      trackIdx.forEach((ti, k) => {
        if (ti === hi || ti === ai) seq[k].push(pts[ti]);
        if (fi === firstFx[k]) { const g = ti === hi ? x - y : y - x; nextRes[k] = g > 0 ? 'W' : g === 0 ? 'D' : 'L'; }
      });
    }
    const order = ids.map((_, i) => i).sort((p, q) =>
      pts[q] - pts[p] || w[q] - w[p] || gd[q] - gd[p] || gf[q] - gf[p] || r() - 0.5);
    order.forEach((ti, pos) => { posCount[ti][pos]++; });
    if (safetyRank > 1) safety.push(pts[order[safetyRank - 2]]);
    for (let i = 0; i < N; i++) ptsSum[i] += pts[i];
    const rankOf = new Int32Array(N); order.forEach((ti, pos) => { rankOf[ti] = pos; });
    trackIdx.forEach((ti, k) => trackIdx.forEach((tj, l) => { if (k !== l && rankOf[ti] < rankOf[tj]) above[k][l]++; }));
    trackIdx.forEach((ti, k) => { traj[ids[ti]].push(seq[k]); if (firstFx[k] >= 0) cond[k][nextRes[k]][order.indexOf(ti)]++; });
  }
  const result = {};
  ids.forEach((id, i) => {
    result[id] = { pos: Array.from(posCount[i], c => c / sims), xPts: ptsSum[i] / sims };
  });
  const trajectories = {};
  for (const id of Object.keys(traj)) {
    const runs = traj[id]; if (!runs.length) continue;
    const L = runs[0].length, band = [];
    for (let k = 0; k < L; k++) {
      const col = runs.map(v => v[k]).sort((p, q) => p - q);
      const q = f => col[Math.min(col.length - 1, Math.floor(f * col.length))];
      band.push({ p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), mean: col.reduce((p, c) => p + c, 0) / col.length });
    }
    trajectories[id] = band;
  }
  let safe = null;
  if (safety.length) {
    safety.sort((p, q) => p - q);
    const q = f => safety[Math.min(safety.length - 1, Math.floor(f * safety.length))];
    safe = { p10: q(0.1), p50: q(0.5), p90: q(0.9) };
  }
  const conditional = {};
  trackIdx.forEach((ti, k) => {
    if (firstFx[k] < 0) return;
    const f = fx[firstFx[k]], out = { matchId: f.id, h: f.h, a: f.a };
    for (const r of ['W', 'D', 'L']) {
      const c = cond[k][r], n = c.reduce((p, q) => p + q, 0);
      out[r] = { n: n / sims, pos: Array.from(c, v => (n ? v / n : 0)) };
    }
    conditional[ids[ti]] = out;
  });
  const finishAbove = {};
  trackIdx.forEach((ti, k) => { finishAbove[ids[ti]] = {}; trackIdx.forEach((tj, l) => { if (k !== l) finishAbove[ids[ti]][ids[tj]] = above[k][l] / sims; }); });
  return { teams: result, trajectories, sims, safety: safe, conditional, finishAbove };
}
