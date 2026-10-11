// Today, Leagues and Model pages.
import { t, tf, pct, num, fmtDate, ordinal } from './i18n.js';
import { GREMIO, INTER, LEAGUES, teamForm } from './api.js';
import { strengthScatter, calibrationChart, probBar } from './charts.js';
import { esc, crest, teamName, rawName, formChips, tiles, matchCard, standingsTable, projectionsTable, card, loading, clubColor } from './ui.js';
import { matchInsight, stakesInsight, raceInsight, insightCard } from './insights.js';

const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();
const byDate = (a, b) => Date.parse(a.date) - Date.parse(b.date);

function clubTile(S, id) {
  const teams = { ...(S.clubs[id]?.teams || {}), ...S.bra.teams };
  const r = S.bra.standings.groups[0]?.rows.find(x => x.id === id);
  const sim = S.braRes?.sim?.teams?.[id];
  const ev = (S.clubs[id]?.events || []).find(m => !m.done) || S.bra.matches.find(m => !m.done && (m.h === id || m.a === id));
  const m = ev && (S.bra.matches.find(x => x.id === ev.id) || ev);
  const p = m && S.braRes?.preds?.[m.id];
  const shown = m?.state === 'in' && p?.live ? p.live : p;
  const head = m ? (m.state === 'in'
    ? `<span class="live-tag"><span class="pulse live"></span>${esc(tf('liveForecast', { min: m.clock, score: `${m.hg}–${m.ag}` }))}</span>`
    : `<span>${esc(t('preForecast'))} · ${fmtDate(m.date)}</span>`) : '';
  const next = m ? `<div style="margin-top:14px">
      <div class="match-meta" style="margin-bottom:6px">${head}<span>${teamName(teams, m.h)} ${esc(t('vs'))} ${teamName(teams, m.a)}</span></div>
      ${shown ? probBar(shown, { names: [tf('winOf', { team: rawName(teams, m.h) }), t('draw'), tf('winOf', { team: rawName(teams, m.a) })] }) +
        `<div class="plegend" style="margin-top:6px"><span class="oc l"><span class="oc-l">${esc(tf('winOf', { team: rawName(teams, m.h) }))}</span> <b>${pct(shown.pH)}</b></span><span class="oc c"><span class="oc-l">${esc(t('draw'))}</span> <b>${pct(shown.pD)}</b></span><span class="oc r"><span class="oc-l">${esc(tf('winOf', { team: rawName(teams, m.a) }))}</span> <b>${pct(shown.pA)}</b></span></div>` : ''}
    </div>` : '';
  return `<a class="card glass link club-tile fade-in" href="#clubs/${id === GREMIO ? 'gremio' : 'inter'}">
    <div class="club-card">${crest(teams, id, 'lg')}<div>
      <div class="club-name">${teamName(teams, id, false)}</div>
      <div class="rank-line"><span class="hero-num">${r ? ordinal(r.rank) : '–'}</span><span class="muted">${r ? `${r.pts} ${t('pts')} · ${r.gp} ${t('played')}` : ''}</span></div>
      <div class="kv">
        <div title="${esc(t('tileRel'))}"><span>${esc(t('chanceRel'))}</span><b>${sim ? pct(sim.zones.relegation) : '…'}</b></div>
        <div title="${esc(t('expPts'))}"><span>${esc(t('expPts'))}</span><b>${sim ? num(sim.xPts) : '…'}</b></div>
        <div><span>${esc(t('form'))}</span><b>${formChips(teamForm(S.bra.matches, id, 5))}</b></div>
      </div>
    </div></div>${next}</a>`;
}

export function homeView(S) {
  const d = new Date();
  const head = `<div class="page-head"><div><h1>${esc(t('navHome'))}</h1><p class="sub">${fmtDate(d.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })} · Brasileirão ${S.bra?.standings?.season ?? ''}</p></div></div>`;
  if (!S.bra) return head + loading();
  const teams = S.bra.teams, P = S.braRes?.preds || {}, PR = S.braRes?.prior || {}, model = S.braRes?.model;
  const today = S.bra.matches.filter(m => isToday(m.date) || m.state === 'in').sort(byDate);
  const upcoming = S.bra.matches.filter(m => !m.done && m.state !== 'in' && !isToday(m.date) && !m.postponed).sort(byDate).slice(0, 10);
  const live = today.filter(m => m.state === 'in');
  const club = m => [m.h, m.a].some(x => x === GREMIO || x === INTER);
  // Insights: Grêmio/Inter matches first, then other live games, then the stakes and the drop battle.
  const items = [];
  for (const m of today.filter(m => m.state === 'in' || club(m) || m.done).sort((a, b) => club(b) - club(a) || (b.state === 'in') - (a.state === 'in')).slice(0, 3))
    items.push(...matchInsight(m, teams, P[m.id], PR[m.id], model).slice(0, club(m) ? 3 : 2));
  for (const id of [GREMIO, INTER]) if (S.braRes?.sim?.conditional?.[id]) items.push(...stakesInsight(id, teams, S.braRes.sim.conditional[id]));
  items.push(...raceInsight(teams, S.braRes?.sim, S.bra.standings.groups[0]?.rows));
  const group = S.bra.standings.groups[0];
  return `${head}
    <div class="grid g2" style="margin-bottom:16px">${clubTile(S, GREMIO)}${clubTile(S, INTER)}</div>
    ${items.length ? `<div style="margin-bottom:16px">${insightCard(t('insights'), items)}</div>` : ''}
    ${card(`${live.length ? '<span class="pulse live" style="display:inline-block;margin-right:8px"></span>' : ''}${esc(t('todayMatches'))}`, `Brasileirão · ${esc(t('todayMatchesSub'))}`,
      today.length ? `<div class="matches">${today.map(m => matchCard(m, teams, { pred: P[m.id], prior: PR[m.id] })).join('')}</div>` : `<p class="muted">${esc(t('noMatchesToday'))}</p>`)}
    <div class="grid g2" style="margin-top:16px">
      ${card(esc(t('standings')), esc(t('standingsSub')), group ? standingsTable(group, teams, { zones: S.bra.league.zones, sim: S.braRes?.sim, compact: true }) : loading())}
      ${card(esc(t('nextMatches')), esc(t('nextMatchesSub')), `<div class="matches" style="grid-template-columns:1fr">${upcoming.map(m => matchCard(m, teams, { pred: P[m.id] })).join('')}</div>`)}
    </div>`;
}

export function leaguesView(S, id) {
  const L = LEAGUES.find(l => l.id === id) || LEAGUES[0];
  const chips = `<div class="chips" role="group" aria-label="${esc(t('selectLeague'))}">${LEAGUES.map(l => `<button class="chip" data-route="leagues/${l.id}" aria-pressed="${l.id === L.id}">${l.flag} ${esc(l.name)}</button>`).join('')}</div>`;
  const head = `<div class="page-head"><div><h1>${esc(L.name)}</h1><p class="sub">${esc(t('sourceNote'))}</p></div></div>`;
  const entry = L.id === 'bra.1' ? { data: S.bra, res: S.braRes } : S.leagues[L.id];
  if (!entry?.data) return head + chips + (entry?.error ? `<div class="banner">${esc(t('error'))}</div>` : loading());
  const { data, res } = entry;
  const teams = data.teams, P = res?.preds || {}, PR = res?.prior || {};
  const season = data.standings.season;
  const cur = data.matches.filter(m => season == null || m.season === season || !m.done);
  const live = cur.filter(m => m.state === 'in' || (isToday(m.date) && !m.done)).sort(byDate);
  const upcoming = cur.filter(m => !m.done && m.state !== 'in' && !isToday(m.date) && !m.postponed).sort(byDate).slice(0, 12);
  const recent = cur.filter(m => m.done).slice(-12).reverse();
  const grid = list => `<div class="matches">${list.map(m => matchCard(m, teams, { pred: P[m.id], prior: PR[m.id] })).join('')}</div>`;
  const items = live.filter(m => P[m.id]).slice(0, 3).flatMap(m => matchInsight(m, teams, P[m.id], PR[m.id], res?.model).slice(0, 2));
  const single = data.standings.groups.length === 1;
  return `${head}${chips}
    ${L.cup ? `<div class="banner">${esc(t('cupNote'))}</div>` : ''}
    ${items.length ? `<div style="margin-bottom:16px">${insightCard(t('insights'), items)}</div>` : ''}
    ${live.length ? card(esc(t('todayMatches')), esc(t('todayMatchesSub')), grid(live)) : ''}
    <div class="grid g2" style="margin-top:16px">
      ${card(esc(t('nextMatches')), L.cup ? '' : esc(t('nextMatchesSub')), upcoming.length ? grid(upcoming) : `<p class="muted">${esc(t('noData'))}</p>`)}
      ${card(esc(t('recentResults')), L.cup ? '' : esc(t('recentResultsSub')), recent.length ? grid(recent) : `<p class="muted">${esc(t('noData'))}</p>`)}
    </div>
    <div style="margin-top:16px">${card(esc(t('standings')), res?.sim ? esc(t('standingsSub')) : '', data.standings.groups.length ? data.standings.groups.map(g => standingsTable(g, teams, { zones: single ? L.zones : null, sim: single ? res?.sim : null })).join('<div style="height:16px"></div>') : `<p class="muted">${esc(t('noData'))}</p>`)}</div>
    ${res?.sim && single ? `<div style="margin-top:16px">${card(esc(t('projections')), esc(tf('projectionsNote', { n: num(res.sim.sims) })), projectionsTable(data.standings.groups[0], teams, res.sim, L.zones))}</div>` : ''}
    ${!L.cup && !res && !entry.error ? loading(t('computing')) : ''}`;
}

export function modelView(S) {
  const head = `<div class="page-head"><div><h1>${esc(t('modelTitle'))}</h1><p class="sub">${esc(t('modelSub'))}</p></div></div>`;
  if (!S.bra) return head + loading();
  const res = S.braRes, teams = S.bra.teams;
  const bt = res?.backtest;
  const from = bt ? fmtDate(bt.from, { month: 'long', year: 'numeric' }) : '';
  const acc = bt ? tiles([
    { label: t('rps'), value: num(bt.rps, 3), desc: tf('rpsDesc', { b: num(bt.baseRps, 3) }), delta: `${pct(1 - bt.rps / bt.baseRps, 1)} ${t('better')}`, dir: 'up' },
    { label: t('logLoss'), value: num(bt.logLoss, 3), desc: tf('llDesc', { b: num(bt.baseLL, 3) }), dir: bt.logLoss < bt.baseLL ? 'up' : 'down' },
    { label: t('hitRate'), value: pct(bt.accuracy), desc: tf('hitDesc', { b: pct(Math.max(...bt.base)) }) },
    { label: t('matchesTested'), value: num(bt.n), desc: tf('testedDesc', { from }) },
  ]) + `<p class="note">${esc(t('rpsNote'))}</p>` : loading(t('computing'));
  const calib = bt ? calibrationChart({ points: bt.calibration, labels: {
    x: t('axisPred'), y: t('axisObs'), aria: t('calibration'),
    tip: p => `${t('axisPred')}: <b>${pct(p.pred, 1)}</b><br>${t('axisObs')}: <b>${pct(p.obs, 1)}</b><br>n = ${p.n}`,
  } }) : '';
  let scatter = '';
  const m = res?.model, group = S.bra.standings.groups[0];
  if (m && group) {
    const avg = Math.exp(m.mu);
    const points = group.rows.filter(r => m.teams[r.id]).map(r => {
      const tm = m.teams[r.id], att = Math.exp(m.mu + tm.att), conc = Math.exp(m.mu - tm.def);
      return { x: att, y: 2 * avg - conc, name: teams[r.id]?.abbr || r.id, color: clubColor(r.id), label: true,
        tip: `<b>${teamName(teams, r.id)}</b> (${ordinal(r.rank)})<br>${t('attackDesc')}: <b>${num(att, 2)}</b><br>${t('defenceDesc')}: <b>${num(conc, 2)}</b>` };
    });
    scatter = strengthScatter({ points, labels: { x: t('attackDesc'), y: `${t('defence')} (${t('defenceDesc').toLowerCase()}, ↑ = ${t('better').split(' ')[0]})`, aria: t('strength') } });
  }
  const done = S.bra.matches.filter(x => x.done && x.season === S.bra.standings.season);
  const stats = done.length ? tiles([
    { label: t('avgGoals'), value: num(done.reduce((a, x) => a + x.hg + x.ag, 0) / done.length, 2) },
    { label: t('homeWinRate'), value: pct(done.filter(x => x.hg > x.ag).length / done.length) },
    { label: t('drawRate'), value: pct(done.filter(x => x.hg === x.ag).length / done.length) },
    { label: t('homeAdv'), value: m ? `+${pct(Math.exp(m.home) - 1)}` : '–', desc: t('homeDesc') },
  ]) : '';
  return `${head}
    <div style="margin-bottom:16px">${card(esc(t('modelTitle')), '', `<div class="prose">${['method1', 'method2', 'method3', 'method4', 'method5'].map(k => { const [a, ...b] = t(k).split('. '); return `<p><b>${esc(a)}.</b> ${esc(b.join('. '))}</p>`; }).join('')}</div>`)}</div>
    <div class="grid g2">
      ${card(esc(t('accuracy')), bt ? esc(tf('accuracySub', { from })) : '', acc)}
      ${card(esc(t('calibration')), esc(t('calibrationNote')), calib || loading(t('computing')))}
    </div>
    <div class="grid g2" style="margin-top:16px">
      ${card(esc(t('strength')), esc(t('strengthNote')), scatter || loading(t('computing')))}
      ${card(esc(tf('leagueStats', { season: S.bra.standings.season ?? '' })), esc(t('leagueStatsSub')), stats)}
    </div>
    ${res?.sim && group ? `<div style="margin-top:16px">${card(esc(t('projections')), esc(tf('projectionsNote', { n: num(res.sim.sims) })), projectionsTable(group, teams, res.sim, S.bra.league.zones))}</div>` : ''}`;
}
