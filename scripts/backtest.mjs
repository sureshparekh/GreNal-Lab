// Local, optional: walk-forward backtest + parameter grid search for docs/assets/js/model.js.
// Run with:  node scripts/backtest.mjs        (needs Node 18+, fetches from ESPN; nothing runs on GitHub)
import { backtest, rps } from '../docs/assets/js/model.js';

const B = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const SEASONS = [2021, 2022, 2023, 2024, 2025];
const TEST = [2023, 2024, 2025];

async function season(lg, yr) {
  const d = await (await fetch(`${B}/${lg}/scoreboard?dates=${yr}&limit=500`)).json();
  return (d.events || []).map(e => {
    const c = e.competitions[0];
    const h = c.competitors.find(x => x.homeAway === 'home'), a = c.competitors.find(x => x.homeAway === 'away');
    const st = (x, n) => { const s = (x.statistics || []).find(s => s.name === n); return s ? +s.displayValue : null; };
    return { date: e.date, done: e.status.type.completed && e.status.type.name === 'STATUS_FULL_TIME', h: h.team.id, a: a.team.id,
      hg: +h.score, ag: +a.score, hst: st(h, 'shotsOnTarget'), ast: st(a, 'shotsOnTarget'), season: yr };
  });
}

const all = (await Promise.all(SEASONS.map(y => season('bra.1', y)))).flat();
const bySeason = y => all.filter(m => m.season === y && m.done);
const range = y => { const s = bySeason(y).map(m => Date.parse(m.date)); return [new Date(Math.min(...s)).toISOString(), new Date(Math.max(...s) + 1).toISOString()]; };

// Baseline: historical H/D/A base rates.
const prior = all.filter(m => m.done && m.season < TEST[0]);
const base = ['H', 'D', 'A'].map(o => prior.filter(m => (m.hg > m.ag ? 'H' : m.hg === m.ag ? 'D' : 'A') === o).length / prior.length);
const testM = TEST.flatMap(bySeason);
const baseRps = testM.reduce((s, m) => s + rps(base, m.hg > m.ag ? 'H' : m.hg === m.ag ? 'D' : 'A'), 0) / testM.length;
console.log('base rates', base.map(v => v.toFixed(3)).join(' '), 'baseline RPS', baseRps.toFixed(4));

function evaluate(opts) {
  let n = 0, r = 0, ll = 0, acc = 0, br = 0;
  for (const y of TEST) {
    const known = new Set(bySeason(y - 1).flatMap(m => [m.h, m.a]));
    const [s, e] = range(y);
    const res = backtest(all.filter(m => m.season <= y), s, e, { ...opts, knownTeams: known });
    n += res.n; r += res.rps * res.n; ll += res.logLoss * res.n; acc += res.accuracy * res.n; br += res.brier * res.n;
  }
  return { n, rps: r / n, logLoss: ll / n, accuracy: acc / n, brier: br / n };
}

const grid = [];
for (const xi of [0.0012, 0.0015, 0.002])
  for (const ridge of [8, 12])
    for (const homeRidge of [0, 10, 25, 60])
      grid.push({ xi, ridge, homeRidge });

const results = [];
for (const g of grid) {
  const res = evaluate(g);
  results.push({ ...g, ...res });
  console.log(JSON.stringify(g), 'RPS', res.rps.toFixed(4), 'LL', res.logLoss.toFixed(4), 'acc', (res.accuracy * 100).toFixed(1) + '%');
}
results.sort((a, b) => a.rps - b.rps);
console.log('\nBEST', results.slice(0, 5));
