// Shared UI components (HTML string builders).
import { t, tf, pct, num, fmtDate, fmtTime, fmtDateTime, ordinal } from './i18n.js';
import { probBar } from './charts.js';
import { GREMIO, INTER } from './api.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clubColor = id => (id === GREMIO ? 'var(--gre)' : id === INTER ? 'var(--int)' : null);

export function crest(teams, id, size = 'sm') {
  const tm = teams[id];
  const src = tm?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${encodeURIComponent(id)}.png`;
  return `<img class="crest ${size}" src="${esc(src)}" alt="" decoding="async" onerror="this.style.visibility='hidden'">`;
}
export const rawName = (teams, id, short = true) => (short ? teams[id]?.short : teams[id]?.name) || teams[id]?.name || String(id);
export const teamName = (teams, id, short = true) => esc(rawName(teams, id, short));

export const formChips = arr => `<span class="form" aria-label="${esc(t('form'))}">${arr.map(r => {
  const L = { W: t('win'), D: t('draw'), L: t('loss') }[r];
  return `<b class="${r}" title="${esc(L)}">${esc(L[0])}</b>`;
}).join('')}</span>`;

// Stat tiles: label, big value, and an explanation of exactly what the number means.
export function tiles(list) {
  return `<div class="tiles">${list.map(x => `<div class="tile"><div class="label">${x.swatch ? `<i style="background:${x.swatch}"></i>` : ''}${esc(x.label)}</div><div class="value">${x.value}</div>${x.desc ? `<div class="desc">${esc(x.desc)}</div>` : ''}${x.delta ? `<div class="delta ${x.dir || ''}">${x.delta}</div>` : ''}</div>`).join('')}</div>`;
}

export const zoneLabel = key => t(key);
export function zoneLegend(zones) {
  if (!zones?.length) return '';
  const seen = new Set();
  return `<div class="zone-legend">${zones.filter(z => !seen.has(z[2]) && seen.add(z[2])).map(([a, b, k]) => `<span style="--c:var(--z-${k})">${esc(t(k))} (${a === b ? ordinal(a) : `${ordinal(a)}–${ordinal(b)}`})</span>`).join('')}</div>`;
}
const zoneOf = (zones, rank) => zones?.find(([a, b]) => rank >= a && rank <= b)?.[2];
const outcomeKey = m => (m.hg > m.ag ? 'pH' : m.hg === m.ag ? 'pD' : 'pA');

// Three named outcomes under every probability bar, so nothing is left to guess.
function outcomeLegend(p, teams, m) {
  const cell = (color, label, v, align) => `<span class="oc ${align}"><i style="background:${color}"></i><span class="oc-l">${esc(label)}</span> <b>${pct(v)}</b></span>`;
  return `<div class="plegend">${cell('var(--home)', tf('winOf', { team: rawName(teams, m.h) }), p.pH, 'l')}${cell('var(--draw)', t('draw'), p.pD, 'c')}${cell('var(--away)', tf('winOf', { team: rawName(teams, m.a) }), p.pA, 'r')}</div>`;
}

// A match card: live / upcoming / finished, with clearly-labelled model probabilities. Links to the match centre.
export function matchCard(m, teams, { pred, prior, showLeague = false } = {}) {
  const live = m.state === 'in', post = m.done;
  const meta = live
    ? `<span class="live-tag"><span class="pulse live"></span>${esc(t('live'))} · ${esc(m.clock || '')}</span>`
    : post ? `<span>${esc(t('ft'))} · ${fmtDate(m.date)}</span>`
    : m.postponed ? `<span>${esc(t('postponed'))}</span>` : `<span>${fmtDateTime(m.date)}</span>`;
  const lgTag = showLeague && m.lgName ? `<span>${esc(m.lgName)}</span>` : m.venue ? `<span class="hide-sm">${esc(m.venue)}</span>` : '<span></span>';
  const score = live || post ? `<div class="score">${m.hg ?? 0}–${m.ag ?? 0}</div>` : `<div class="score pre">${fmtTime(m.date)}</div>`;
  const names = [rawName(teams, m.h), t('draw'), rawName(teams, m.a)];
  const p = live && pred?.live ? pred.live : post ? prior : pred;
  let body = '';
  if (p) {
    const head = live && pred?.live ? tf('liveForecast', { min: m.clock || '', score: `${m.hg}–${m.ag}` })
      : post ? tf('finalNote', { p: pct(prior[outcomeKey(m)]) }) : t('preForecast');
    const tag = post ? (prior[outcomeKey(m)] < 0.25 ? `<span class="pill warn">${esc(t('surprise'))}</span>` : prior[outcomeKey(m)] >= 0.45 ? `<span class="pill">${esc(t('expected'))}</span>` : '') : '';
    body += `<div class="fc-head"><span>${esc(head)}</span>${tag}</div>`;
    body += probBar(p, { names: [tf('winOf', { team: names[0] }), names[1], tf('winOf', { team: names[2] })] });
    body += outcomeLegend(p, teams, m);
    if (live && pred) body += `<div class="xtra"><span>${esc(t('preForecast'))}: ${pct(pred.pH)} · ${pct(pred.pD)} · ${pct(pred.pA)}</span></div>`;
    else if (!post && pred?.top) body += `<div class="xtra"><span>${esc(t('xg'))}: ${num(pred.lh, 1)} – ${num(pred.la, 1)}</span><span>${esc(t('likelyScores'))}: ${pred.top.slice(0, 3).map(s => `${s.h}–${s.a}`).join(', ')}</span></div>`;
  } else if (!post && !live && showLeague) {
    body += `<div class="xtra"><span>${esc(t('noModel'))}</span></div>`;
  }
  const lg = m.lg || 'bra.1';
  return `<a class="match${live ? ' is-live' : ''}" href="#match/${encodeURIComponent(lg)}/${encodeURIComponent(m.id)}" aria-label="${esc(t('openMatch'))}: ${esc(names[0])} ${esc(t('vs'))} ${esc(names[2])}">
    <div class="match-meta">${meta}${lgTag}</div>
    <div class="teams">
      <div class="side">${crest(teams, m.h, 'md')}<span>${esc(names[0])}</span></div>
      ${score}
      <div class="side away">${crest(teams, m.a, 'md')}<span>${esc(names[2])}</span></div>
    </div>${body}</a>`;
}

export function standingsTable(group, teams, { zones, sim, compact = false, highlight = [GREMIO, INTER] } = {}) {
  const head = `<tr><th class="l">${t('pos')}</th><th class="l">${t('team')}</th><th>${t('played')}</th>${compact ? '' : `<th class="hide-sm">${t('won')}</th><th class="hide-sm">${t('drawn')}</th><th class="hide-sm">${t('lost')}</th><th class="hide-sm">${t('gf')}</th><th class="hide-sm">${t('ga')}</th>`}<th>${t('gd')}</th><th>${t('pts')}</th>${sim ? `<th title="${esc(t('expPts'))}">${esc(t('projPtsCol'))}</th><th title="${esc(t('tileRel'))}">${esc(t('relCol'))}</th>` : ''}</tr>`;
  const rows = group.rows.map((r, i) => {
    const rank = r.rank || i + 1, z = zoneOf(zones, rank), hl = highlight.includes(r.id);
    const s = sim?.teams?.[r.id];
    return `<tr class="${hl ? 'hl' : ''}" style="${hl ? `--hlc:${clubColor(r.id)}` : ''}">
      <td class="rank l" style="${z ? `--zone:var(--z-${z})` : ''}">${rank}</td>
      <td class="team l">${crest(teams, r.id)}<span>${teamName(teams, r.id)}</span></td>
      <td>${r.gp}</td>${compact ? '' : `<td class="hide-sm">${r.w}</td><td class="hide-sm">${r.d}</td><td class="hide-sm">${r.l}</td><td class="hide-sm">${r.gf}</td><td class="hide-sm">${r.ga}</td>`}
      <td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="pts">${r.pts}</td>
      ${sim ? `<td>${s ? num(s.xPts) : '–'}</td><td>${s ? pct(s.zones?.relegation || 0) : '–'}</td>` : ''}</tr>`;
  }).join('');
  return `${group.name && !compact ? `<h3 style="margin:6px 0 8px">${esc(group.name)}</h3>` : ''}<div class="table-wrap"><table>${head}${rows}</table></div>${zones ? zoneLegend(zones) : ''}`;
}

// Heatmap of finishing-position probabilities (single blue hue, light → dark).
export function projectionsTable(group, teams, sim, zones) {
  const N = group.rows.length;
  const order = [...group.rows].sort((a, b) => (sim.teams[b.id]?.xPts || 0) - (sim.teams[a.id]?.xPts || 0));
  const head = `<tr><th class="l">${t('team')}</th><th>${esc(t('projPtsCol'))}</th>${Array.from({ length: N }, (_, i) => `<th>${ordinal(i + 1)}</th>`).join('')}</tr>`;
  const rows = order.map(r => {
    const s = sim.teams[r.id];
    if (!s) return '';
    const cells = s.pos.map((p, i) => {
      const a = p < 0.005 ? 0 : 0.12 + 0.88 * Math.sqrt(p);
      const ink = a > 0.55 ? '#fff' : 'var(--ink-2)';
      return `<td class="heat"><span style="background:rgba(var(--heat),${a.toFixed(3)});color:${ink}" data-tip="${esc(`${teamName(teams, r.id)} · ${ordinal(i + 1)}: <b>${pct(p, 1)}</b>`)}">${p >= 0.005 ? Math.round(p * 100) : ''}</span></td>`;
    }).join('');
    const hl = [GREMIO, INTER].includes(r.id);
    return `<tr class="${hl ? 'hl' : ''}" style="${hl ? `--hlc:${clubColor(r.id)}` : ''}"><td class="team l">${crest(teams, r.id)}<span>${teamName(teams, r.id)}</span></td><td class="pts">${num(s.xPts)}</td>${cells}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table>${head}${rows}</table></div>${zoneLegend(zones)}`;
}

export const loading = (msg = t('loading')) => `<div class="loading"><span class="spinner"></span>${esc(msg)}</div>`;

export function card(title, sub, body, cls = '') {
  return `<section class="card glass ${cls}"><div class="card-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>${body}</section>`;
}

// Chart legend row: [{ color, label, kind: 'line' | 'band' | 'ref' }]
export const legend = items => `<div class="legend">${items.map(i => `<span><i class="${i.kind || ''}" style="background:${i.color}"></i>${esc(i.label)}</span>`).join('')}</div>`;
