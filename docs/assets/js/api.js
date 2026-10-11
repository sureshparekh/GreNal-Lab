// ESPN public API client: fetch, normalize to a compact shape, cache in localStorage.
// All requests go straight from the visitor's browser (ESPN serves CORS *); no server needed.

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STAND = 'https://site.api.espn.com/apis/v2/sports/soccer';
const PREFIX = 'placar.v1.';

export const GREMIO = '6273';
export const INTER = '1936';
export const CLUBS = [GREMIO, INTER];

// zones: [from, to, key]; `cross` = season spans two calendar years; `cup` = no league model.
export const LEAGUES = [
  { id: 'bra.1', name: 'Brasileirão Série A', flag: '🇧🇷', years: 3, zones: [[1, 6, 'libertadores'], [7, 12, 'sudamericana'], [17, 20, 'relegation']] },
  { id: 'bra.2', name: 'Brasileirão Série B', flag: '🇧🇷', zones: [[1, 4, 'promotion'], [17, 20, 'relegation']] },
  { id: 'bra.copa_do_brazil', name: 'Copa do Brasil', flag: '🇧🇷', cup: true },
  { id: 'conmebol.libertadores', name: 'Copa Libertadores', flag: '🌎', cup: true },
  { id: 'conmebol.sudamericana', name: 'Copa Sul-Americana', flag: '🌎', cup: true },
  { id: 'eng.1', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cross: true, zones: [[1, 4, 'champions'], [5, 5, 'europa'], [18, 20, 'relegation']] },
  { id: 'esp.1', name: 'LaLiga', flag: '🇪🇸', cross: true, zones: [[1, 4, 'champions'], [5, 6, 'europa'], [18, 20, 'relegation']] },
  { id: 'ita.1', name: 'Serie A', flag: '🇮🇹', cross: true, zones: [[1, 4, 'champions'], [5, 6, 'europa'], [18, 20, 'relegation']] },
  { id: 'ger.1', name: 'Bundesliga', flag: '🇩🇪', cross: true, zones: [[1, 4, 'champions'], [5, 6, 'europa'], [16, 16, 'playoff'], [17, 18, 'relegation']] },
  { id: 'fra.1', name: 'Ligue 1', flag: '🇫🇷', cross: true, zones: [[1, 3, 'champions'], [4, 5, 'europa'], [16, 16, 'playoff'], [17, 18, 'relegation']] },
  { id: 'por.1', name: 'Liga Portugal', flag: '🇵🇹', cross: true, zones: [[1, 2, 'champions'], [3, 4, 'europa'], [16, 16, 'playoff'], [17, 18, 'relegation']] },
  { id: 'ned.1', name: 'Eredivisie', flag: '🇳🇱', cross: true, zones: [[1, 2, 'champions'], [3, 4, 'europa'], [16, 16, 'playoff'], [17, 18, 'relegation']] },
  { id: 'arg.1', name: 'Liga Profesional', flag: '🇦🇷' },
  { id: 'usa.1', name: 'MLS', flag: '🇺🇸' },
  { id: 'mex.1', name: 'Liga MX', flag: '🇲🇽' },
  { id: 'uefa.champions', name: 'UEFA Champions League', flag: '🇪🇺', cup: true },
];
export const league = id => LEAGUES.find(l => l.id === id) || LEAGUES[0];

// ---------- cache ----------
function cacheGet(key, ttlMs) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t < ttlMs ? v : null;
  } catch { return null; }
}
function cacheSet(key, v) {
  const s = JSON.stringify({ t: Date.now(), v });
  try { localStorage.setItem(PREFIX + key, s); }
  catch {
    // Quota exceeded: drop our oldest entries and retry once.
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
        .map(k => { try { return [k, JSON.parse(localStorage.getItem(k)).t]; } catch { return [k, 0]; } })
        .sort((a, b) => a[1] - b[1]);
      keys.slice(0, Math.ceil(keys.length / 2)).forEach(([k]) => localStorage.removeItem(k));
      localStorage.setItem(PREFIX + key, s);
    } catch { /* storage unavailable — run uncached */ }
  }
}

async function getJSON(url, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { err = e; await new Promise(res => setTimeout(res, 600 * (i + 1))); }
    finally { clearTimeout(timer); }
  }
  throw err;
}

// ---------- normalization ----------
const scoreOf = s => (s == null ? null : typeof s === 'object' ? (s.value ?? +s.displayValue) : +s);

function normTeam(t, teams) {
  if (!t || !t.id) return;
  const logo = t.logo || t.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${t.id}.png`;
  const prev = teams[t.id] || {};
  teams[t.id] = {
    id: t.id,
    name: t.displayName || t.name || prev.name,
    short: t.shortDisplayName || t.displayName || prev.short,
    abbr: t.abbreviation || prev.abbr || (t.displayName || '').slice(0, 3).toUpperCase(),
    logo, color: t.color || prev.color,
  };
}

export function normEvent(e, teams, leagueId) {
  const c = e.competitions?.[0];
  if (!c) return null;
  const st = c.status || e.status || {};
  const h = c.competitors.find(x => x.homeAway === 'home'), a = c.competitors.find(x => x.homeAway === 'away');
  if (!h || !a) return null;
  normTeam(h.team, teams); normTeam(a.team, teams);
  const state = st.type?.state || 'pre';
  const name = st.type?.name || '';
  const sot = x => { const s = (x.statistics || []).find(s => s.name === 'shotsOnTarget'); return s ? +s.displayValue : null; };
  return {
    id: e.id, date: e.date, lg: e.league?.slug || leagueId,
    lgName: e.league?.abbreviation || e.league?.name || null,
    season: e.season?.year ?? null,
    state, status: name, detail: st.type?.shortDetail || '',
    done: state === 'post' && !!st.type?.completed && !/POSTPONED|CANCELED|ABANDONED/.test(name),
    postponed: /POSTPONED|CANCELED|SUSPENDED/.test(name),
    clock: st.displayClock || '', minute: st.clock != null ? Math.floor(st.clock / 60) : null, period: st.period || 0,
    h: h.team.id, a: a.team.id, hg: scoreOf(h.score), ag: scoreOf(a.score),
    hst: sot(h), ast: sot(a),
    neutral: !!c.neutralSite, venue: c.venue?.fullName || '',
    round: e.week?.number ?? null,
  };
}

function normStandings(d, teams) {
  const groups = (d.children || []).map(ch => {
    const s = ch.standings || {};
    const rows = (s.entries || []).map(en => {
      normTeam(en.team, teams);
      const v = Object.fromEntries((en.stats || []).map(x => [x.name, x.value]));
      return { id: en.team.id, rank: v.rank, gp: v.gamesPlayed || 0, w: v.wins || 0, d: v.ties || 0, l: v.losses || 0,
        gf: v.pointsFor || 0, ga: v.pointsAgainst || 0, gd: v.pointDifferential || 0, pts: v.points || 0, ded: v.deductions || 0 };
    }).sort((p, q) => (p.rank || 99) - (q.rank || 99));
    return { name: ch.name, season: s.season, rows };
  });
  return { season: groups[0]?.season ?? null, groups };
}

// ---------- public loaders ----------
async function seasonEvents(lg, year, teams, ttl) {
  const key = `ev.${lg}.${year}`;
  const cached = cacheGet(key, ttl);
  if (cached) { Object.assign(teams, { ...cached.teams, ...teams }); return cached.events; }
  const d = await getJSON(`${SITE}/${lg}/scoreboard?dates=${year}&limit=1000`);
  const local = {};
  const events = (d.events || []).map(e => normEvent(e, local, lg)).filter(Boolean);
  Object.assign(teams, { ...local, ...teams });
  cacheSet(key, { events, teams: local });
  return events;
}

// Full dataset for a league: teams, every match in the modelling window, current standings.
export async function loadLeague(lgId, { force = false } = {}) {
  const L = league(lgId);
  const now = new Date(), Y = now.getUTCFullYear();
  const back = L.years || 2;
  const years = [];
  for (let y = Y - back; y <= Y + (L.cross ? 1 : 0); y++) years.push(y);
  const teams = {};
  const lists = await Promise.all(years.map(y => {
    // Finished calendar years never change: cache for a week. Current/next: 10 minutes.
    const ttl = force && y >= Y ? 0 : y < Y ? 7 * 864e5 : 10 * 6e4;
    return seasonEvents(lgId, y, teams, ttl).catch(() => []);
  }));
  const byId = new Map();
  for (const ev of lists.flat()) byId.set(ev.id, ev);
  let standings = cacheGet(`st.${lgId}`, force ? 0 : 5 * 6e4);
  if (!standings) {
    try {
      const local = {};
      standings = normStandings(await getJSON(`${STAND}/${lgId}/standings`), local);
      standings.teams = local;
      cacheSet(`st.${lgId}`, standings);
    } catch { standings = { season: null, groups: [], teams: {} }; }
  }
  Object.assign(teams, standings.teams || {});
  const matches = [...byId.values()].sort((p, q) => Date.parse(p.date) - Date.parse(q.date));
  return { league: L, teams, matches, standings, fetchedAt: Date.now() };
}

// Today's scoreboard only (small) — used for the fast live loop.
export async function loadToday(lgId) {
  const d = await getJSON(`${SITE}/${lgId}/scoreboard`);
  const teams = {};
  const events = (d.events || []).map(e => normEvent(e, teams, lgId)).filter(Boolean);
  return { events, teams };
}

export async function loadStandings(lgId) {
  const teams = {};
  const s = normStandings(await getJSON(`${STAND}/${lgId}/standings`), teams);
  s.teams = teams;
  cacheSet(`st.${lgId}`, s);
  return s;
}

// A club's fixtures and results across every competition.
export async function loadClubSchedule(teamId) {
  const key = `club.${teamId}`;
  const cached = cacheGet(key, 5 * 6e4);
  if (cached) return cached;
  const teams = {};
  const [fx, res] = await Promise.all([
    getJSON(`${SITE}/all/teams/${teamId}/schedule?fixture=true`).catch(() => ({ events: [] })),
    getJSON(`${SITE}/all/teams/${teamId}/schedule?season=${new Date().getUTCFullYear()}`).catch(() => ({ events: [] })),
  ]);
  const byId = new Map();
  for (const e of [...(res.events || []), ...(fx.events || [])]) {
    const n = normEvent(e, teams, e.league?.slug);
    if (n) byId.set(n.id, n);
  }
  const out = { teams, events: [...byId.values()].sort((p, q) => Date.parse(p.date) - Date.parse(q.date)) };
  cacheSet(key, out);
  return out;
}

// Match centre: key events, team stats, line-ups and commentary for one match.
export async function loadSummary(lgId, eventId) {
  const d = await getJSON(`${SITE}/${encodeURIComponent(lgId)}/summary?event=${encodeURIComponent(eventId)}`);
  const teams = {};
  const comp = d.header?.competitions?.[0];
  const match = comp ? normEvent({ id: eventId, date: comp.date, competitions: [comp], season: d.header?.season, league: { slug: lgId } }, teams, lgId) : null;
  if (match) match.venue = d.gameInfo?.venue?.fullName || match.venue;
  const kindOf = e => {
    const tx = (e.type?.text || '').toLowerCase();
    if (e.scoringPlay || tx.includes('goal')) return 'goal';
    if (tx.includes('red') || tx.includes('second yellow')) return 'red';
    if (tx.includes('yellow')) return 'yellow';
    if (tx.includes('substitution')) return 'sub';
    if (/kickoff|halftime|half ends|start 2nd|end regular|full ?time/.test(tx)) return 'phase';
    return null;
  };
  const events = (d.keyEvents || []).map(e => {
    const kind = kindOf(e);
    if (!kind) return null;
    // "33'" → 33; first-half stoppage "45'+7'" stays at 45 so it doesn't overlap the second half; "90'+3'" → 93.
    const dm = /(\d+)'(?:\+(\d+))?/.exec(e.clock?.displayValue || '');
    const minute = dm ? +dm[1] + (+dm[1] >= 90 ? +(dm[2] || 0) : 0) : e.clock?.value != null ? Math.ceil(e.clock.value / 60) : null;
    return {
      kind, clock: e.clock?.displayValue || '', minute,
      team: e.team?.id || null, text: e.text || e.type?.text || '',
      players: (e.participants || []).map(p => p.athlete?.displayName).filter(Boolean),
      ownGoal: !!e.ownGoal || /own goal/i.test(e.text || ''), penalty: !!e.penaltyKick || /penalty/i.test(e.type?.text || ''),
      label: e.type?.text || '',
    };
  }).filter(Boolean);
  const stats = {};
  for (const tm of d.boxscore?.teams || []) {
    stats[tm.team.id] = Object.fromEntries((tm.statistics || []).map(s => [s.name, s.displayValue]));
  }
  const rosters = (d.rosters || []).map(r => ({
    team: r.team?.id, formation: r.formation || '',
    players: (r.roster || []).map(p => ({
      name: p.athlete?.displayName || '', jersey: p.jersey || '', pos: p.position?.abbreviation || '',
      starter: !!p.starter, subIn: !!p.subbedIn, subOut: !!p.subbedOut,
    })),
  }));
  const commentary = (d.commentary || []).map(c => ({ time: c.time?.displayValue || '', text: c.text || '' })).filter(c => c.text);
  return { match, teams, events, stats, rosters, commentary, home: match?.h, away: match?.a, fetchedAt: Date.now() };
}

// Merge live events into a dataset in place; returns true when a match finished (model refit needed).
export function mergeEvents(data, events, teams) {
  let finished = false;
  const idx = new Map(data.matches.map((m, i) => [m.id, i]));
  for (const ev of events) {
    const i = idx.get(ev.id);
    if (i == null) { data.matches.push(ev); if (ev.done) finished = true; continue; }
    if (ev.done && !data.matches[i].done) finished = true;
    data.matches[i] = { ...data.matches[i], ...ev };
  }
  Object.assign(data.teams, teams);
  return finished;
}

export function teamForm(matches, id, n = 5, before = Infinity) {
  return matches.filter(m => m.done && (m.h === id || m.a === id) && Date.parse(m.date) < before)
    .slice(-n).map(m => {
      const gf = m.h === id ? m.hg : m.ag, ga = m.h === id ? m.ag : m.hg;
      return gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    });
}
