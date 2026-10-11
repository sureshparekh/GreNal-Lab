// App controller: routing, data orchestration, the live refresh loop, and model runs in a worker.
import { t, setLang, getLang, fmtTime } from './i18n.js';
import { loadLeague, loadToday, loadStandings, loadClubSchedule, loadSummary, mergeEvents, CLUBS } from './api.js';
import { installTooltip } from './charts.js';
import { homeView, leaguesView, modelView } from './views.js';
import { clubsView } from './views-club.js';
import { matchView } from './views-match.js';

const S = { route: { page: 'home', arg: null }, match: null, bra: null, braRes: null, leagues: {}, clubs: {}, updated: null, offline: false, busy: false };
const app = document.getElementById('app');

// ---------- model worker ----------
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let reqId = 0;
const pending = new Map();
worker.onmessage = e => {
  const { id, ok, result, error } = e.data;
  const p = pending.get(id); pending.delete(id);
  if (!p) return;
  ok ? p.resolve(result) : p.reject(new Error(error));
};
const compute = payload => new Promise((resolve, reject) => { const id = ++reqId; pending.set(id, { resolve, reject }); worker.postMessage({ id, payload }); });

// Club fixtures in other competitions get predictions too when both clubs are in the league model.
const clubExtras = () => CLUBS.flatMap(id => (S.clubs[id]?.events || []).filter(m => !m.done && m.lg !== 'bra.1'));

// Weekly trend points (all but the live "now" point) are stable, so keep them between visits.
const trendKey = () => `placar.trend.v1.${S.bra?.standings?.season}`;
function readTrendCache() { try { return JSON.parse(localStorage.getItem(trendKey()) || '{}'); } catch { return {}; } }
function writeTrendCache(trend) {
  try { localStorage.setItem(trendKey(), JSON.stringify(Object.fromEntries(trend.slice(0, -1).map(p => [p.t, p])))); } catch {}
}

let braRun = 0, fullPending = false;
async function runBra({ full = true } = {}) {
  if (!S.bra) return;
  if (!full && fullPending) return; // the running full fit already includes the latest data
  if (full) fullPending = true;
  const my = ++braRun;
  S.busy = true; renderStatus();
  try {
    const res = await compute({
      matches: S.bra.matches, standings: S.bra.standings, season: S.bra.standings.season,
      zones: S.bra.league.zones, track: CLUBS, extras: clubExtras(), wantTrend: full, wantBacktest: full, wantPrior: full,
      trendCache: full ? readTrendCache() : {},
    });
    if (full && res.trend) writeTrendCache(res.trend);
    if (my !== braRun) return;
    // Light runs (score changes) keep the expensive trend/backtest from the last full run.
    if (!full && S.braRes) { res.trend = mergeTrend(S.braRes.trend, res); res.backtest = S.braRes.backtest; res.prior = S.braRes.prior; }
    S.braRes = res;
  } catch (e) { console.error(e); }
  finally { if (full) fullPending = false; }
  if (my === braRun) { S.busy = false; render(); }
}
function mergeTrend(trend, res) {
  if (!trend?.length || !res.sim) return trend;
  const last = { t: Date.now() };
  for (const id of CLUBS) if (res.sim.teams[id]) last[id] = { ...res.sim.teams[id].zones, xPts: res.sim.teams[id].xPts };
  return [...trend.slice(0, -1), last];
}

async function runLeague(id) {
  const entry = S.leagues[id];
  if (!entry?.data || entry.data.league.cup) return;
  const d = entry.data;
  try {
    entry.res = await compute({ matches: d.matches, standings: d.standings, season: d.standings.season, zones: d.league.zones, track: [], sims: 5000, wantTrend: false, wantBacktest: false });
  } catch (e) { console.error(e); }
  render();
}

// ---------- loading ----------
async function bootBra(force = false) {
  try {
    S.bra = await loadLeague('bra.1', { force });
    S.updated = Date.now(); S.offline = false;
  } catch (e) { console.error(e); S.offline = true; }
  // Season data may come from cache — overlay today's live scoreboard before the first paint/model run.
  let today = null;
  try { today = await loadToday('bra.1'); if (S.bra) mergeEvents(S.bra, today.events, today.teams); } catch {}
  render();
  // Fast pass first (fit + predictions + season sim), while club schedules load in parallel.
  const clubs = Promise.all(CLUBS.map(async id => {
    try {
      S.clubs[id] = await loadClubSchedule(id);
      if (today) mergeEvents({ matches: S.clubs[id].events, teams: S.clubs[id].teams }, today.events.filter(e => e.h === id || e.a === id), {});
    } catch {}
  }));
  await runBra({ full: false });
  await clubs;
  render();
  await runBra({ full: true });
}

async function ensureLeague(id) {
  if (id === 'bra.1') return;
  if (S.leagues[id]?.data || S.leagues[id]?.loading) return;
  S.leagues[id] = { loading: true };
  try {
    S.leagues[id] = { data: await loadLeague(id) };
    render();
    await runLeague(id);
  } catch (e) { S.leagues[id] = { error: true }; render(); }
}

// ---------- match centre ----------
let matchTimer = null;
async function loadMatch(lg, id) {
  clearTimeout(matchTimer);
  const key = `${lg}/${id}`;
  if (S.match?.key !== key) S.match = { key };
  try {
    S.match.data = await loadSummary(lg, id);
    S.match.error = false;
    // Keep the league dataset in step with the richer summary feed.
    const ds = lg === 'bra.1' ? S.bra : S.leagues[lg]?.data;
    if (ds && S.match.data.match) mergeEvents(ds, [S.match.data.match], S.match.data.teams);
  } catch (e) { if (!S.match.data) S.match.error = true; }
  if (S.route.page !== 'match' || S.route.arg !== key) return;
  render();
  const st = S.match.data?.match?.state;
  // Live: every 20 s. Before kick-off: every 2 min (line-ups appear). Finished: stop.
  if (st === 'in' || st === 'pre') matchTimer = setTimeout(() => loadMatch(lg, id), st === 'in' ? 20e3 : 120e3);
}

// ---------- live loop ----------
// Poll today's scoreboard: every 30 s while anything is live, every minute near kick-off, else every 5 min.
let timer = null;
function nextDelay() {
  const all = [S.bra, ...Object.values(S.leagues).map(l => l.data)].filter(Boolean).flatMap(d => d.matches);
  const now = Date.now();
  if (all.some(m => m.state === 'in')) return 30e3;
  if (all.some(m => !m.done && Math.abs(Date.parse(m.date) - now) < 20 * 6e4)) return 60e3;
  return 5 * 6e4;
}
async function tick() {
  clearTimeout(timer);
  if (document.hidden) return;
  const ids = ['bra.1'];
  if (S.route.page === 'leagues' && S.route.arg && S.route.arg !== 'bra.1' && S.leagues[S.route.arg]?.data) ids.push(S.route.arg);
  for (const id of ids) {
    const data = id === 'bra.1' ? S.bra : S.leagues[id].data;
    if (!data) continue;
    try {
      const before = JSON.stringify(data.matches.filter(m => m.state === 'in' || !m.done).map(m => [m.id, m.hg, m.ag, m.state]));
      const { events, teams } = await loadToday(id);
      const finished = mergeEvents(data, events, teams);
      // Keep club schedules in step with live scores.
      if (id === 'bra.1') for (const c of CLUBS) if (S.clubs[c]) mergeEvents({ matches: S.clubs[c].events, teams: S.clubs[c].teams }, events.filter(e => e.h === c || e.a === c), {});
      const after = JSON.stringify(data.matches.filter(m => m.state === 'in' || !m.done).map(m => [m.id, m.hg, m.ag, m.state]));
      S.updated = Date.now(); S.offline = false;
      if (finished) {
        try { data.standings = await loadStandings(id); Object.assign(data.teams, data.standings.teams); } catch {}
        id === 'bra.1' ? runBra({ full: true }) : runLeague(id);
      } else if (before !== after || events.some(e => e.state === 'in')) {
        id === 'bra.1' ? runBra({ full: false }) : runLeague(id);
      }
    } catch (e) { S.offline = true; }
  }
  render();
  timer = setTimeout(tick, nextDelay());
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
// Full refresh every 15 minutes picks up rescheduled fixtures and table corrections.
setInterval(() => { if (!document.hidden) bootBra(true); }, 15 * 6e4);

// ---------- routing ----------
const PAGES = [
  ['home', 'navHome', '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'],
  ['clubs', 'navClubs', '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/>'],
  ['leagues', 'navLeagues', '<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9.5 17h5"/>'],
  ['model', 'navModel', '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>'],
];
function parseHash() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/').map(decodeURIComponent);
  if (parts[0] === 'match' && parts[1] && parts[2]) return { page: 'match', arg: `${parts[1]}/${parts[2]}` };
  return { page: PAGES.some(p => p[0] === parts[0]) ? parts[0] : 'home', arg: parts[1] || null };
}
function onRoute() {
  if (S.route.page === 'leagues') ensureLeague(S.route.arg || 'bra.1');
  if (S.route.page === 'match') { const [lg, id] = S.route.arg.split('/'); loadMatch(lg, id); } else clearTimeout(matchTimer);
}
window.addEventListener('hashchange', () => { S.route = parseHash(); onRoute(); render(true); });
document.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) { e.preventDefault(); if (history.length > 1) history.back(); else location.hash = 'home'; return; }
  const b = e.target.closest('[data-route]');
  if (b) { e.preventDefault(); location.hash = b.getAttribute('data-route'); }
});

// ---------- chrome ----------
const THEMES = ['auto', 'light', 'dark'];
const ICONS = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
};
let theme = (() => { try { return localStorage.getItem('placar.theme') || 'auto'; } catch { return 'auto'; } })();
function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme');
  btn.innerHTML = ICONS[theme];
  btn.setAttribute('aria-label', `${t('theme')}: ${t(theme)}`); btn.title = `${t('theme')}: ${t(theme)}`;
}
document.getElementById('theme').addEventListener('click', () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % 3];
  try { localStorage.setItem('placar.theme', theme); } catch {}
  applyTheme();
});
document.getElementById('lang').addEventListener('click', e => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  setLang(b.dataset.lang); applyTheme(); render();
});

function renderChrome() {
  const cur = S.route.page;
  const btn = ([id, key]) => `<button data-route="${id}" ${cur === id ? 'aria-current="page"' : ''}>${t(key)}</button>`;
  document.getElementById('nav').innerHTML = PAGES.map(btn).join('');
  document.getElementById('tabbar').innerHTML = PAGES.map(([id, key, icon]) =>
    `<button data-route="${id}" ${cur === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${icon}</svg>${t(key)}</button>`).join('');
  document.querySelectorAll('#lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  document.getElementById('footer').innerHTML = `<b>${t('appName')}</b> · ${t('tagline')}<br>${t('sourceNote')}<br>${t('disclaimer')}`;
}
function renderStatus() {
  const el = document.getElementById('status');
  const live = S.bra?.matches.some(m => m.state === 'in');
  const dot = S.offline ? 'off' : live ? 'live' : '';
  const txt = S.offline ? t('offline') : S.busy ? t('computing') : S.updated ? `${live ? t('live') + ' · ' : ''}${t('updated')} ${fmtTime(new Date(S.updated).toISOString())}` : t('loading');
  el.innerHTML = `<span class="pulse ${dot}"></span><span class="txt">${txt}</span>`;
  el.title = txt;
}

let lastHtml = '';
function render(scrollTop = false) {
  renderChrome(); renderStatus();
  const { page, arg } = S.route;
  let html;
  try {
    html = page === 'match' ? matchView(S, ...arg.split('/'))
      : page === 'clubs' ? clubsView(S, arg || 'gremio')
      : page === 'leagues' ? leaguesView(S, arg || 'bra.1')
      : page === 'model' ? modelView(S)
      : homeView(S);
  } catch (e) { console.error(e); html = `<div class="banner">${t('error')}</div>`; }
  const y = scrollY;
  const next = (S.offline ? `<div class="banner">${t('offline')}</div>` : '') + html;
  // Only touch the DOM when something visible changed (keeps images, focus and hover stable).
  if (next !== lastHtml) { app.innerHTML = next; lastHtml = next; }
  if (scrollTop) { scrollTo(0, 0); app.focus({ preventScroll: true }); } else scrollTo(0, y);
  document.title = `GreNal Lab — ${page === 'match' ? t('matchCentre') : t(PAGES.find(p => p[0] === page)[1])}`;
}

// ---------- boot ----------
setLang(getLang());
applyTheme();
installTooltip();
S.route = parseHash();
render();
bootBra().then(() => { timer = setTimeout(tick, nextDelay()); });
onRoute();
