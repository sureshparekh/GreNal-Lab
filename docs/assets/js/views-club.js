// Grêmio / Internacional pages and the Gre-Nal comparison.
import { t, tf, pct, num, fmtDate, ordinal } from './i18n.js';
import { GREMIO, INTER, teamForm } from './api.js';
import { fanChart, positionChart, lineChart } from './charts.js';
import { esc, crest, teamName, rawName, formChips, tiles, matchCard, card, loading, clubColor, zoneLabel, legend } from './ui.js';
import { matchInsight, stakesInsight, outlookInsight, formInsight, luckInsight, runInInsight, rivalryInsight, raceInsight, insightCard } from './insights.js';

const SLUG = { gremio: GREMIO, inter: INTER };
const table = S => S.bra?.standings?.groups?.[0]?.rows || [];
const row = (S, id) => table(S).find(r => r.id === id);
const season = S => S.bra.standings.season;

// Cumulative league points by match number this season.
function pointsPath(S, id) {
  let pts = 0, k = 0;
  const out = [{ k: 0, pts: 0 }];
  for (const m of S.bra.matches) {
    if (!m.done || m.season !== season(S) || (m.h !== id && m.a !== id)) continue;
    const gf = m.h === id ? m.hg : m.ag, ga = m.h === id ? m.ag : m.hg;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0; k++;
    out.push({ k, pts });
  }
  // Sync with the official table (point deductions, data lag).
  const r = row(S, id);
  if (r && r.gp === k && r.pts !== pts) { const d = r.pts - pts; out.forEach(p => { if (p.k) p.pts += d; }); }
  return out;
}

// The club's next (or live) match, preferring the league dataset's live copy.
function nextMatch(S, id) {
  const ev = (S.clubs[id]?.events || []).find(m => !m.done) || S.bra.matches.find(m => !m.done && (m.h === id || m.a === id));
  return ev && (S.bra.matches.find(x => x.id === ev.id) || ev);
}

function clubHeader(S, id) {
  const r = row(S, id), teams = S.bra.teams;
  return `<section class="card glass club-card fade-in">
    ${crest(teams, id, 'lg')}
    <div>
      <div class="club-name">${teamName(teams, id, false)}</div>
      <div class="rank-line"><span class="hero-num">${r ? ordinal(r.rank) : '–'}</span><span class="muted">Brasileirão ${season(S)} · ${r ? `${r.pts} ${t('pts')}` : ''}</span></div>
      <div class="kv">
        <div><span>${t('played')}</span><b>${r?.gp ?? '–'}</b></div>
        <div><span>${t('won')}–${t('drawn')}–${t('lost')}</span><b>${r ? `${r.w}–${r.d}–${r.l}` : '–'}</b></div>
        <div><span>${t('gf')} / ${t('ga')}</span><b>${r ? `${r.gf} / ${r.ga}` : '–'}</b></div>
        <div><span>${t('form')}</span><b>${formChips(teamForm(S.bra.matches, id, 5))}</b></div>
      </div>
    </div></section>`;
}

function outlookTiles(S, id) {
  const sim = S.braRes?.sim?.teams?.[id];
  if (!sim) return loading(t('computing'));
  const traj = S.braRes.sim.trajectories?.[id]?.at(-1);
  const pos = sim.pos;
  let best = 0; pos.forEach((p, i) => { if (p > pos[best]) best = i; });
  const cum = (from, to) => pos.slice(from - 1, to).reduce((a, b) => a + b, 0);
  const prev = S.braRes.trend?.at(-2)?.[id];
  const delta = (cur, old, upGood) => {
    if (old == null) return {};
    const d = cur - old;
    if (Math.abs(d) < 0.005) return { delta: '±0 · 7d' };
    return { delta: `${d > 0 ? '▲' : '▼'} ${Math.round(Math.abs(d) * 100)} p.p. · 7d`, dir: (d > 0) === upGood ? 'up' : 'down' };
  };
  return tiles([
    { label: t('relegation'), value: pct(sim.zones.relegation), desc: t('tileRel'), swatch: 'var(--z-relegation)', ...delta(sim.zones.relegation, prev?.relegation, false) },
    { label: `${t('sudamericana')}+`, value: pct(cum(1, 12)), desc: t('tileSud'), swatch: 'var(--z-sudamericana)', ...delta(cum(1, 12), prev ? prev.sudamericana + prev.libertadores : null, true) },
    { label: t('libertadores'), value: pct(sim.zones.libertadores), desc: t('tileLib'), swatch: 'var(--z-libertadores)' },
    { label: t('expPts'), value: traj ? num(traj.p50) : num(sim.xPts), desc: traj ? tf('tilePts', { lo: traj.p10, hi: traj.p90 }) : '' },
    { label: t('expPos'), value: ordinal(best + 1), desc: tf('tilePos', { p: pct(pos[best]) }) },
  ]);
}

function seasonCharts(S, id) {
  const res = S.braRes;
  if (!res?.sim) return '';
  const color = clubColor(id), name = rawName(S.bra.teams, id);
  const past = pointsPath(S, id);
  const band = res.sim.trajectories[id] || [];
  const fan = fanChart({ past, band, safety: res.sim.safety, color, total: past.at(-1).k + band.length,
    labels: { safety: t('safetyLine'), played: t('played'), pts: t('pts'), aria: tf('pointsTrajectory', { team: name }), xTitle: t('axisMatches'), yTitle: t('axisPoints') } });
  const posC = positionChart({ pos: res.sim.teams[id].pos, color, zones: S.bra.league.zones, zoneLabel,
    labels: { ordinal, pct, aria: tf('finishDist', { team: name }), xTitle: t('axisFinal'), yTitle: t('axisProb') } });
  const lg = legend([{ color, label: t('points') }, { color, label: t('bands'), kind: 'band' }, { color: 'var(--ink-3)', label: t('safetyLine'), kind: 'ref' }]);
  return `<div class="grid g2">
    ${card(esc(tf('pointsTrajectory', { team: name })), esc(t('trajectoryNote')), lg + fan)}
    ${card(esc(tf('finishDist', { team: name })), esc(tf('finishNote', { team: name })), posC)}
  </div>`;
}

function trendChart(S, ids) {
  const tr = S.braRes?.trend;
  const single = ids.length === 1;
  const title = single ? tf('trend', { team: rawName(S.bra.teams, ids[0]) }) : t('trendGrenal');
  const note = single ? t('trendNote') : t('trendGrenalNote');
  if (!tr?.length) return card(esc(title), esc(note), loading(t('computing')));
  const series = single ? [
    { name: t('chanceRel'), color: 'var(--s-down)', points: tr.filter(p => p[ids[0]]).map(p => ({ t: p.t, v: p[ids[0]].relegation })) },
    { name: t('chanceTop12'), color: 'var(--s-up)', points: tr.filter(p => p[ids[0]]).map(p => ({ t: p.t, v: (p[ids[0]].sudamericana || 0) + (p[ids[0]].libertadores || 0) })) },
  ] : ids.map(id => ({ name: `${rawName(S.bra.teams, id)} · ${t('chanceRel').toLowerCase()}`, color: clubColor(id), points: tr.filter(p => p[id]).map(p => ({ t: p.t, v: p[id].relegation })) }));
  const chart = lineChart({ series, fmtX: v => fmtDate(new Date(v).toISOString(), { day: 'numeric', month: 'short' }), fmtY: v => pct(v),
    labels: { aria: title, yTitle: t('axisProb') } });
  return card(esc(title), esc(note), legend(series.map(s => ({ color: s.color, label: s.name }))) + chart);
}

function strengthTiles(S, id) {
  const m = S.braRes?.model, tm = m?.teams?.[id];
  if (!tm) return '';
  const avg = Math.exp(m.mu);
  const att = Math.exp(m.mu + tm.att), conc = Math.exp(m.mu - tm.def);
  const homeEdge = Math.exp(m.home + (tm.ha || 0)) - 1;
  const rel = v => `${v >= 0 ? '+' : '−'}${pct(Math.abs(v))} vs ${num(avg, 2)}`;
  return card(esc(t('strength')), esc(t('clubStrengthNote')), tiles([
    { label: t('attack'), value: num(att, 2), desc: t('attackDesc'), delta: rel(att / avg - 1), dir: att >= avg ? 'up' : 'down' },
    { label: t('defence'), value: num(conc, 2), desc: t('defenceDesc'), delta: rel(conc / avg - 1), dir: conc <= avg ? 'up' : 'down' },
    { label: t('homeAdv'), value: `+${pct(homeEdge)}`, desc: t('homeDesc') },
  ]));
}

function fixturesBlock(S, id) {
  const sched = S.clubs[id];
  if (!sched) return card(esc(t('nextMatches')), esc(t('allComps')), loading());
  const teams = { ...sched.teams, ...S.bra.teams };
  const live = sched.events.filter(m => m.state === 'in').map(m => S.bra.matches.find(x => x.id === m.id) || m);
  const next = sched.events.filter(m => !m.done && m.state !== 'in').slice(0, 6);
  const recent = sched.events.filter(m => m.done).slice(-6).reverse();
  const P = S.braRes?.preds || {}, PR = S.braRes?.prior || {};
  const cards = list => `<div class="matches">${list.map(m => matchCard(m, teams, { pred: P[m.id], prior: PR[m.id], showLeague: true })).join('')}</div>`;
  return `${live.length ? card(`<span class="live-tag" style="color:#ff3b30">● ${esc(t('live'))}</span>`, esc(t('todayMatchesSub')), cards(live)) : ''}
    ${card(esc(t('nextMatches')), `${esc(t('allComps'))} · ${esc(t('nextMatchesSub'))}`, next.length ? cards(next) : `<p class="muted">${esc(t('noData'))}</p>`)}
    ${card(esc(t('recentResults')), `${esc(t('allComps'))} · ${esc(t('recentResultsSub'))}`, recent.length ? cards(recent) : `<p class="muted">${esc(t('noData'))}</p>`)}`;
}

// Everything the model can say about one club, most time-sensitive first.
export function clubInsightItems(S, id) {
  const res = S.braRes;
  if (!res) return [];
  const teams = { ...(S.clubs[id]?.teams || {}), ...S.bra.teams };
  const m = nextMatch(S, id), items = [];
  if (m) items.push(...matchInsight(m, teams, res.preds?.[m.id], res.prior?.[m.id], res.model));
  if (res.sim?.conditional?.[id]) items.push(...stakesInsight(id, teams, res.sim.conditional[id]));
  items.push(...outlookInsight(id, teams, table(S), res.sim, res.remaining?.[id], res.trend));
  items.push(...formInsight(id, teams, S.bra.matches, season(S)));
  if (res.prior) items.push(...luckInsight(id, teams, S.bra.matches, res.prior, season(S)));
  items.push(...runInInsight(id, teams, S.bra.matches, res.preds || {}, res.sim, season(S)));
  return items;
}

function subnav(active) {
  const items = [['gremio', 'Grêmio'], ['inter', 'Internacional'], ['grenal', t('grenal')]];
  return `<div class="seg" role="group">${items.map(([k, l]) => `<button data-route="clubs/${k}" aria-pressed="${k === active}">${esc(l)}</button>`).join('')}</div>`;
}

export function clubsView(S, arg = 'gremio') {
  const title = arg === 'grenal' ? t('grenal') : arg === 'inter' ? 'Internacional' : 'Grêmio';
  const head = `<div class="page-head"><div><h1>${esc(title)}</h1><p class="sub">Brasileirão ${S.bra?.standings?.season ?? ''} · ${esc(t('seasonOutlook'))}</p></div>${subnav(arg)}</div>`;
  if (!S.bra) return head + loading();
  if (arg === 'grenal') return head + grenalView(S);
  const id = SLUG[arg] || GREMIO;
  const res = S.braRes;
  return `${head}
    <div class="grid" style="gap:16px">
      ${clubHeader(S, id)}
      ${insightCard(t('insights'), clubInsightItems(S, id))}
      ${card(esc(t('seasonOutlook')), res?.sim ? esc(tf('seasonOutlookSub', { n: num(res.sim.sims), left: res.remaining?.[id] ?? '' })) : '', outlookTiles(S, id))}
      ${seasonCharts(S, id)}
      <div class="grid g2">${trendChart(S, [id])}${strengthTiles(S, id)}</div>
      ${fixturesBlock(S, id)}
    </div>`;
}

function grenalView(S) {
  const teams = S.bra.teams, res = S.braRes;
  const ids = [GREMIO, INTER];
  const r = ids.map(id => row(S, id));
  const sim = ids.map(id => res?.sim?.teams?.[id]);
  const line = (label, f) => `<div class="r"><b>${f(0)}</b></div><div class="c">${esc(label)}</div><div><b>${f(1)}</b></div>`;
  const m = res?.model;
  const att = i => (m?.teams?.[ids[i]] ? num(Math.exp(m.mu + m.teams[ids[i]].att), 2) : '–');
  const def = i => (m?.teams?.[ids[i]] ? num(Math.exp(m.mu - m.teams[ids[i]].def), 2) : '–');
  const compare = `<div class="vs-grid">
    <div class="r" style="display:flex;justify-content:flex-end">${crest(teams, GREMIO, 'lg')}</div><div class="c">${esc(t('vs'))}</div><div>${crest(teams, INTER, 'lg')}</div>
    ${line(t('position'), i => (r[i] ? ordinal(r[i].rank) : '–'))}
    ${line(t('pts'), i => r[i]?.pts ?? '–')}
    ${line(t('expPts'), i => (sim[i] ? num(sim[i].xPts) : '–'))}
    ${line(t('chanceRel'), i => (sim[i] ? pct(sim[i].zones.relegation) : '–'))}
    ${line(t('chanceTop12'), i => (sim[i] ? pct(sim[i].pos.slice(0, 12).reduce((a, b) => a + b, 0)) : '–'))}
    ${line(`${t('attack')} · ${t('attackDesc').toLowerCase()}`, att)}
    ${line(`${t('defence')} · ${t('defenceDesc').toLowerCase()}`, def)}
    ${line(t('form'), i => formChips(teamForm(S.bra.matches, ids[i], 5)))}
  </div>`;
  // Every Gre-Nal we have: league seasons in the model window plus this year's other competitions.
  const pool = new Map();
  const isGrenal = x => [x.h, x.a].includes(GREMIO) && [x.h, x.a].includes(INTER);
  for (const mm of S.bra.matches) if (isGrenal(mm)) pool.set(mm.id, mm);
  for (const id of ids) for (const mm of S.clubs[id]?.events || []) if (isGrenal(mm)) pool.set(mm.id, { ...mm, ...(pool.get(mm.id) || {}) });
  const all = [...pool.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const played = all.filter(x => x.done).reverse(), upcoming = all.filter(x => !x.done);
  let w = 0, d = 0, l = 0;
  for (const x of played) { const g = x.h === GREMIO ? x.hg - x.ag : x.ag - x.hg; if (g > 0) w++; else if (g === 0) d++; else l++; }
  const P = res?.preds || {}, PR = res?.prior || {};
  const h2h = `<div class="tiles" style="margin-bottom:12px">
      <div class="tile"><div class="label"><i style="background:var(--gre)"></i>${esc(tf('winOf', { team: 'Grêmio' }))}</div><div class="value">${w}</div></div>
      <div class="tile"><div class="label">${esc(t('draw'))}</div><div class="value">${d}</div></div>
      <div class="tile"><div class="label"><i style="background:var(--int)"></i>${esc(tf('winOf', { team: 'Inter' }))}</div><div class="value">${l}</div></div></div>
    <div class="list">${played.slice(0, 10).map(x => `<a class="row" href="#match/${encodeURIComponent(x.lg || 'bra.1')}/${encodeURIComponent(x.id)}"><span class="muted">${fmtDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>${teamName(teams, x.h)} <span class="res">${x.hg}–${x.ag}</span> ${teamName(teams, x.a)}</span><span class="muted">${esc(x.lgName || 'Brasileirão')}</span></a>`).join('')}</div>`;
  const items = [];
  if (upcoming[0]) {
    items.push(...matchInsight(upcoming[0], teams, P[upcoming[0].id], PR[upcoming[0].id], res?.model));
    for (const id of ids) if (res?.sim?.conditional?.[id]?.matchId === upcoming[0].id) items.push(...stakesInsight(id, teams, res.sim.conditional[id]));
  }
  items.push(...rivalryInsight(GREMIO, INTER, teams, res?.sim));
  items.push(...raceInsight(teams, res?.sim, table(S)));
  return `<div class="grid" style="gap:16px">
    ${insightCard(t('insights'), items)}
    ${upcoming.length ? card(esc(t('prediction')), esc(t('nextMatchesSub')), `<div class="matches">${upcoming.slice(0, 2).map(x => matchCard(x, teams, { pred: P[x.id], prior: PR[x.id], showLeague: true })).join('')}</div>`) : ''}
    <div class="grid g2">${card(esc(t('compare')), esc(t('compareSub')), compare)}${card(esc(t('h2h')), esc(t('h2hSub')), h2h)}</div>
    ${trendChart(S, ids)}
  </div>`;
}
