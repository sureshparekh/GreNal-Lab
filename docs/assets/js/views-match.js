// Match centre: live score, forecast timeline, key moments, stats, line-ups and commentary.
import { t, tf, pct, num, fmtDateTime } from './i18n.js';
import { league } from './api.js';
import { predictLive, predictMatch } from './model.js';
import { lineChart, probBar } from './charts.js';
import { esc, crest, rawName, card, loading, legend } from './ui.js';
import { matchInsight, statsInsight, insightCard } from './insights.js';

const STAT_KEYS = ['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'saves', 'foulsCommitted', 'offsides', 'yellowCards', 'redCards', 'passPct'];
const ICON = { goal: '⚽', yellow: '🟨', red: '🟥', sub: '⇄' };

// Pick the fitted model that covers both clubs (the match's own league first, then the Brasileirão model).
export function modelFor(S, lg, h, a) {
  const cands = [lg === 'bra.1' ? S.braRes : S.leagues[lg]?.res, S.braRes].filter(Boolean);
  return cands.find(r => r.model?.teams?.[h] && r.model?.teams?.[a]) || null;
}

// Rebuild the forecast at every minute from the goal times.
function timeline(model, m, goals, endMin) {
  const pts = { H: [], D: [], A: [] };
  for (let k = 0; k <= endMin; k++) {
    let hs = 0, as = 0;
    for (const g of goals) if (g.minute != null && g.minute < k + 1) { if (g.team === m.h) hs++; else if (g.team === m.a) as++; }
    const p = predictLive(model, m.h, m.a, hs, as, k, m.neutral);
    pts.H.push({ t: k, v: p.pH }); pts.D.push({ t: k, v: p.pD }); pts.A.push({ t: k, v: p.pA });
  }
  return pts;
}

function statRows(sum, teams) {
  const H = sum.home, A = sum.away, s = sum.stats;
  const rows = STAT_KEYS.map(k => {
    const hv = parseFloat(s[H]?.[k]), av = parseFloat(s[A]?.[k]);
    if (isNaN(hv) || isNaN(av)) return '';
    const fmt = v => (k === 'passPct' ? pct(v) : k === 'possessionPct' ? `${num(v)}%` : num(v));
    const tot = hv + av, share = tot > 0 ? hv / tot : 0.5;
    return `<div class="stat"><b>${fmt(hv)}</b><span>${esc(t('st_' + k))}</span><b>${fmt(av)}</b>
      <div class="sbar" role="img" aria-label="${esc(t('st_' + k))}: ${esc(rawName(teams, H))} ${fmt(hv)}, ${esc(rawName(teams, A))} ${fmt(av)}"><i style="flex:${share};background:var(--home)"></i><i style="flex:${1 - share};background:var(--away)"></i></div></div>`;
  }).join('');
  return rows ? legend([{ color: 'var(--home)', label: rawName(teams, H) }, { color: 'var(--away)', label: rawName(teams, A) }]) + `<div class="stats">${rows}</div>` : '';
}

function eventsList(sum, teams) {
  const evs = sum.events.filter(e => e.kind !== 'phase');
  if (!evs.length) return `<p class="muted">${esc(t('noData'))}</p>`;
  const label = e => (e.kind === 'goal' ? (e.ownGoal ? t('ownGoal') : e.penalty ? `${t('goal')} (${t('penalty').toLowerCase()})` : t('goal')) : t(e.kind));
  return `<ol class="events">${evs.map(e => {
    const side = e.team === sum.home ? 'h' : e.team === sum.away ? 'a' : 'n';
    const who = e.kind === 'sub' && e.players.length > 1 ? `${esc(e.players[0])} <span class="muted">↔ ${esc(e.players[1])}</span>`
      : e.kind === 'goal' && e.players.length > 1 ? `${esc(e.players[0])} <span class="muted">(${esc(e.players[1])})</span>` : esc(e.players[0] || '');
    return `<li class="ev ${side} k-${e.kind}"><span class="ev-min">${esc(e.clock)}</span><span class="ev-ico" aria-hidden="true">${ICON[e.kind] || '•'}</span><span class="ev-body"><b>${esc(label(e))}</b> · ${esc(rawName(teams, e.team))}<br>${who}</span></li>`;
  }).join('')}</ol>`;
}

function lineups(sum, teams) {
  if (!sum.rosters.length) return `<p class="muted">${esc(t('notStarted'))}</p>`;
  const col = r => {
    const st = r.players.filter(p => p.starter), bench = r.players.filter(p => !p.starter);
    const li = p => `<li><span class="jn">${esc(p.jersey)}</span>${esc(p.name)} <span class="muted">${esc(p.pos)}</span>${p.subOut ? ' <span class="muted">↓</span>' : ''}${p.subIn ? ' <span class="muted">↑</span>' : ''}</li>`;
    return `<div><h3>${crest(teams, r.team)} ${esc(rawName(teams, r.team))} <span class="muted">${esc(r.formation)}</span></h3>
      <p class="muted small">${esc(t('starters'))}</p><ul class="lu">${st.map(li).join('')}</ul>
      <p class="muted small">${esc(t('subs'))}</p><ul class="lu">${bench.map(li).join('')}</ul></div>`;
  };
  const order = [...sum.rosters].sort((a, b) => (a.team === sum.home ? -1 : 0) - (b.team === sum.home ? -1 : 0));
  return `<div class="grid g2">${order.map(col).join('')}</div>`;
}

export function matchView(S, lg, id) {
  const back = `<a class="back" href="#home" data-back>‹ ${esc(t('back'))}</a>`;
  const entry = S.match;
  if (!entry || entry.key !== `${lg}/${id}` || (!entry.data && !entry.error)) return `${back}<div class="page-head"><div><h1>${esc(t('matchCentre'))}</h1></div></div>${loading()}`;
  if (entry.error) return `${back}<div class="banner">${esc(t('error'))}</div>`;
  const sum = entry.data, m = sum.match;
  const teams = { ...sum.teams, ...(S.bra?.teams || {}) };
  const res = modelFor(S, lg, m.h, m.a);
  const model = res?.model;
  let pred = res?.preds?.[m.id];
  if (!pred && model && !m.done) {
    const p = predictMatch(model, m.h, m.a, m.neutral), n = predictMatch(model, m.h, m.a, true);
    pred = { ...p, neutral: { pH: n.pH, pD: n.pD, pA: n.pA } };
  }
  if (pred && m.state === 'in' && model) pred = { ...pred, live: predictLive(model, m.h, m.a, m.hg, m.ag, m.minute, m.neutral) };
  const prior = res?.prior?.[m.id];
  const live = m.state === 'in';
  const status = live ? `<span class="live-tag"><span class="pulse live"></span>${esc(t('live'))} · ${esc(m.clock)}</span>` : m.done ? esc(t('ft')) : esc(fmtDateTime(m.date));
  const hero = `<section class="card glass mc-hero fade-in">
    <div class="mc-meta"><span>${esc(league(lg).name || m.lgName || '')}</span><span>${esc(m.venue || '')}</span></div>
    <div class="mc-teams">
      <div class="mc-side">${crest(teams, m.h, 'lg')}<b>${esc(rawName(teams, m.h, false))}</b></div>
      <div class="mc-score">${live || m.done ? `${m.hg}–${m.ag}` : esc(t('vs'))}<small>${status}</small></div>
      <div class="mc-side">${crest(teams, m.a, 'lg')}<b>${esc(rawName(teams, m.a, false))}</b></div>
    </div></section>`;
  // Forecast card: exactly which forecast is shown, with all three outcomes named.
  const shown = live && pred?.live ? pred.live : m.done ? prior : pred;
  const fHead = live && pred?.live ? tf('liveForecast', { min: m.clock, score: `${m.hg}–${m.ag}` }) : m.done ? (prior ? tf('finalNote', { p: pct(prior[m.hg > m.ag ? 'pH' : m.hg === m.ag ? 'pD' : 'pA']) }) : '') : t('preForecast');
  const names = [tf('winOf', { team: rawName(teams, m.h) }), t('draw'), tf('winOf', { team: rawName(teams, m.a) })];
  const forecast = shown ? card(esc(t('prediction')), esc(fHead), `${probBar(shown, { names })}
    <div class="plegend big"><span class="oc l"><i style="background:var(--home)"></i><span class="oc-l">${esc(names[0])}</span> <b>${pct(shown.pH)}</b></span><span class="oc c"><i style="background:var(--draw)"></i><span class="oc-l">${esc(names[1])}</span> <b>${pct(shown.pD)}</b></span><span class="oc r"><span class="oc-l">${esc(names[2])}</span> <b>${pct(shown.pA)}</b><i style="background:var(--away);margin:0 0 0 5px"></i></span></div>
    ${live && pred ? `<p class="note">${esc(t('preForecast'))}: ${esc(names[0])} ${pct(pred.pH)} · ${esc(names[1])} ${pct(pred.pD)} · ${esc(names[2])} ${pct(pred.pA)}</p>` : ''}
    ${!m.done && pred?.top ? `<p class="note">${esc(t('xg'))}: ${num(pred.lh, 2)} – ${num(pred.la, 2)} · ${esc(t('likelyScores'))}: ${pred.top.slice(0, 4).map(s => `${s.h}–${s.a} (${pct(s.p)})`).join(', ')}</p>` : ''}`) : '';
  // Forecast timeline.
  let tl = '';
  if (model && (live || m.done)) {
    const goals = sum.events.filter(e => e.kind === 'goal');
    const end = m.done ? Math.max(93, ...goals.map(g => g.minute || 0)) : Math.max(1, m.minute || 0);
    const pts = timeline(model, m, goals, end);
    const series = [
      { name: names[0], color: 'var(--home)', points: pts.H },
      { name: names[1], color: 'var(--ink-3)', points: pts.D },
      { name: names[2], color: 'var(--away)', points: pts.A },
    ];
    tl = card(esc(t('winProbTimeline')), esc(t('winProbNote')), legend(series.map(s => ({ color: s.color, label: s.name }))) + lineChart({
      series, fmtX: v => `${Math.round(v)}'`, fmtY: v => pct(v), xDomain: [0, Math.max(90, end)], ticksAt: [0, 15, 30, 45, 60, 75, 90],
      marks: goals.map(g => ({ t: Math.min(g.minute ?? 0, end), label: `⚽ ${g.clock}` })),
      labels: { aria: t('winProbTimeline'), xTitle: t('axisMinute'), yTitle: t('axisProb') },
    }));
  }
  const items = [...matchInsight(m, teams, pred, prior, model), ...statsInsight(sum, teams)];
  const comm = sum.commentary.slice(-25).reverse();
  return `${back}
    <div class="grid" style="gap:16px">
      ${hero}
      ${insightCard(t('insights'), items)}
      <div class="grid g2">${forecast}${tl || card(esc(t('keyEvents')), '', eventsList(sum, teams))}</div>
      ${tl ? `<div class="grid g2">${card(esc(t('keyEvents')), '', eventsList(sum, teams))}${card(esc(t('matchStats')), '', statRows(sum, teams) || `<p class="muted">${esc(t('notStarted'))}</p>`)}</div>` : card(esc(t('matchStats')), '', statRows(sum, teams) || `<p class="muted">${esc(t('notStarted'))}</p>`)}
      ${card(esc(t('lineups')), '', lineups(sum, teams))}
      ${comm.length ? card(esc(t('commentary')), esc(t('commentaryNote')), `<ol class="comm">${comm.map(c => `<li><span class="ev-min">${esc(c.time)}</span><span>${esc(c.text)}</span></li>`).join('')}</ol>`) : ''}
    </div>`;
}
