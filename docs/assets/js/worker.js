// Web Worker: fits the model, predicts fixtures, simulates the season, rebuilds the
// historical prediction trend and runs a live backtest — off the UI thread.
import { fitModel, predictMatch, predictLive, simulateSeason, backtest } from './model.js';

const DAY = 864e5;

function knownTeams(matches, season) {
  const prev = matches.filter(m => m.season === season - 1 && m.done);
  return prev.length ? new Set(prev.flatMap(m => [m.h, m.a])) : null;
}

// Table as of a timestamp, built from results (used to reconstruct past outlooks).
function tableAt(ids, matches, t) {
  const T = new Map(ids.map(id => [id, { id, pts: 0, w: 0, gd: 0, gf: 0, gp: 0 }]));
  for (const m of matches) {
    if (!m.done || Date.parse(m.date) >= t) continue;
    const h = T.get(m.h), a = T.get(m.a);
    if (!h || !a) continue;
    h.gp++; a.gp++; h.gf += m.hg; a.gf += m.ag; h.gd += m.hg - m.ag; a.gd += m.ag - m.hg;
    if (m.hg > m.ag) { h.pts += 3; h.w++; } else if (m.hg < m.ag) { a.pts += 3; a.w++; } else { h.pts++; a.pts++; }
  }
  return [...T.values()];
}

function zoneProbs(pos, zones) {
  const out = {};
  for (const [from, to, key] of zones || []) {
    let p = 0;
    for (let i = from - 1; i < to && i < pos.length; i++) p += pos[i];
    out[key] = (out[key] || 0) + p;
  }
  out.title = pos[0];
  return out;
}

export function run({ matches, standings, season, zones, track, sims = 10000, extras = [], wantTrend, wantBacktest, wantPrior = true, trendCache = {} }) {
  const now = Date.now();
  const known = knownTeams(matches, season);
  const model = fitModel(matches, now, { knownTeams: known });
  const res = { model: { mu: model.mu, home: model.home, rho: model.rho, teams: model.teams, n: model.n } };

  // Predictions for every unfinished league fixture (+ extra cross-competition fixtures).
  const preds = {};
  const pending = matches.filter(m => !m.done);
  for (const m of [...pending, ...extras]) {
    if (!model.teams[m.h] || !model.teams[m.a]) continue;
    const p = predictMatch(model, m.h, m.a, m.neutral);
    const n = m.neutral ? p : predictMatch(model, m.h, m.a, true);
    preds[m.id] = { pH: p.pH, pD: p.pD, pA: p.pA, lh: p.lh, la: p.la, over25: p.over25, btts: p.btts, top: p.top, neutral: { pH: n.pH, pD: n.pD, pA: n.pA } };
    if (m.state === 'in' && m.hg != null) preds[m.id].live = predictLive(model, m.h, m.a, m.hg, m.ag, m.minute, m.neutral);
  }
  // Pre-match probabilities for finished matches of this season ("was it a surprise?").
  const seasonDone = wantPrior ? matches.filter(m => m.done && m.season === season) : [];
  const prior = {};
  const weeks = new Map();
  for (const m of seasonDone) {
    const wk = Math.floor(Date.parse(m.date) / (7 * DAY));
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk).push(m);
  }
  for (const [wk, list] of weeks) {
    const t = Math.min(...list.map(m => Date.parse(m.date)));
    const mdl = fitModel(matches, t, { knownTeams: known });
    for (const m of list) {
      const p = predictMatch(mdl, m.h, m.a, m.neutral);
      prior[m.id] = { pH: p.pH, pD: p.pD, pA: p.pA };
    }
  }
  res.prior = prior;
  res.preds = preds;

  // Season simulation (single-table leagues only).
  const table = standings?.groups?.length === 1 ? standings.groups[0].rows : null;
  if (table && table.length) {
    const ids = new Set(table.map(r => r.id));
    const fixtures = matches.filter(m => !m.done && m.season === season && ids.has(m.h) && ids.has(m.a));
    if (fixtures.length) {
      const sim = simulateSeason(model, table.map(r => ({ id: r.id, pts: r.pts, w: r.w, gd: r.gd, gf: r.gf })), fixtures, { sims, track, safetyRank: zones?.find(z => z[2] === 'relegation')?.[0] });
      res.sim = { sims: sim.sims, teams: {}, trajectories: sim.trajectories, safety: sim.safety, conditional: {}, finishAbove: sim.finishAbove };
      for (const [id, c] of Object.entries(sim.conditional || {})) {
        res.sim.conditional[id] = { matchId: c.matchId, h: c.h, a: c.a };
        for (const r of ['W', 'D', 'L']) res.sim.conditional[id][r] = { n: c[r].n, zones: zoneProbs(c[r].pos, zones) };
      }
      for (const [id, v] of Object.entries(sim.teams)) res.sim.teams[id] = { ...v, zones: zoneProbs(v.pos, zones) };
      res.remaining = Object.fromEntries(table.map(r => [r.id, fixtures.filter(f => f.h === r.id || f.a === r.id).length]));
    }
    // Weekly reconstruction of the outlook for tracked clubs, using only data known at the time.
    if (wantTrend && track.length) {
      const all = matches.filter(m => m.season === season && ids.has(m.h) && ids.has(m.a));
      const start = Math.min(...all.map(m => Date.parse(m.date)));
      const trend = [];
      for (let t = start + 14 * DAY; t < now; t += 7 * DAY) {
        // Past weeks never change: reuse points the page cached from earlier visits.
        if (trendCache[t]) { trend.push(trendCache[t]); continue; }
        const mdl = fitModel(matches, t, { knownTeams: known });
        const fx = all.filter(m => Date.parse(m.date) >= t);
        if (!fx.length) break;
        const s = simulateSeason(mdl, tableAt([...ids], all, t), fx, { sims: 800, seed: 11 });
        const point = { t };
        for (const id of track) if (s.teams[id]) point[id] = { ...zoneProbs(s.teams[id].pos, zones), xPts: s.teams[id].xPts };
        trend.push(point);
      }
      if (res.sim) {
        const point = { t: now };
        for (const id of track) if (res.sim.teams[id]) point[id] = { ...res.sim.teams[id].zones, xPts: res.sim.teams[id].xPts };
        trend.push(point);
      }
      res.trend = trend;
    }
  }

  // Live walk-forward backtest over the last ~15 months.
  if (wantBacktest) {
    const done = matches.filter(m => m.done);
    if (done.length > 200) {
      const end = new Date(now).toISOString();
      const startD = new Date(now - 450 * DAY).toISOString();
      const bt = backtest(matches, startD, end, { knownTeams: known });
      const hist = done.filter(m => Date.parse(m.date) < Date.parse(startD));
      const base = ['H', 'D', 'A'].map(o => hist.filter(m => (m.hg > m.ag ? 'H' : m.hg === m.ag ? 'D' : 'A') === o).length / Math.max(1, hist.length));
      const test = done.filter(m => Date.parse(m.date) >= Date.parse(startD));
      let bRps = 0, bLL = 0;
      for (const m of test) {
        const oi = m.hg > m.ag ? 0 : m.hg === m.ag ? 1 : 2;
        const c1 = base[0] - (oi === 0), c2 = base[0] + base[1] - (oi <= 1);
        bRps += (c1 * c1 + c2 * c2) / 2; bLL -= Math.log(base[oi]);
      }
      res.backtest = { ...bt, baseRps: bRps / test.length, baseLL: bLL / test.length, base, from: startD };
    }
  }
  return res;
}

if (typeof self !== "undefined") self.onmessage = e => {
  const { id, payload } = e.data;
  try { self.postMessage({ id, ok: true, result: run(payload) }); }
  catch (err) { self.postMessage({ id, ok: false, error: String(err?.stack || err) }); }
};
