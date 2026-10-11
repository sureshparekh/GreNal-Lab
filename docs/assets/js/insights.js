// Plain-language explanations generated from the model's numbers (EN / PT), entirely client-side.
// Each insight is { tag, html }; rules decide what is worth saying, templates say it.
import { getLang, pct, num, pp, pts, fmtDate, ordinal, t, ptArt } from './i18n.js';
import { predictLive } from './model.js';
import { esc } from './ui.js';

const PT = () => getLang() === 'pt';
const raw = (teams, id) => teams[id]?.short || teams[id]?.name || id;
const nm = (teams, id) => `<b>${esc(raw(teams, id))}</b>`;
// Portuguese helpers: o/do/no + club, e.g. "do Grêmio", "da Chapecoense".
const o = (teams, id) => `${ptArt.o(raw(teams, id))} ${nm(teams, id)}`;
const O = (teams, id) => `${ptArt.O(raw(teams, id))} ${nm(teams, id)}`;
const d = (teams, id) => `${ptArt.do(raw(teams, id))} ${nm(teams, id)}`;
const item = (tag, html) => ({ tag: t(tag), html });
const outcomeKey = m => (m.hg > m.ag ? 'pH' : m.hg === m.ag ? 'pD' : 'pA');

// ---------- one match ----------
export function matchInsight(m, teams, pred, prior, model) {
  const out = [];
  const H = nm(teams, m.h), A = nm(teams, m.a);
  if (m.done && prior) {
    const k = outcomeKey(m), p = prior[k];
    const fav = prior.pH >= prior.pA ? m.h : m.a, favP = Math.max(prior.pH, prior.pA);
    const res = k === 'pD' ? (PT() ? 'o empate' : 'a draw') : PT() ? `a vitória ${d(teams, k === 'pH' ? m.h : m.a)}` : `${nm(teams, k === 'pH' ? m.h : m.a)} winning`;
    const verdict = p < 0.25 ? (PT() ? 'foi uma zebra' : 'this was an upset') : p >= 0.45 ? (PT() ? 'foi o resultado esperado' : 'this was the expected result') : (PT() ? 'foi um resultado plausível, mas não o favorito' : 'a plausible result, but not the favourite outcome');
    out.push(item('tagResult', PT()
      ? `${H} ${m.hg}–${m.ag} ${A}. Antes do jogo, o modelo dava ${pct(p)} de chance para ${res} — ${verdict}. O favorito era ${o(teams, fav)}, com ${pct(favP)}.`
      : `${H} ${m.hg}–${m.ag} ${A}. Before kick-off the model gave ${res} a ${pct(p)} chance — ${verdict}. The favourite was ${nm(teams, fav)} at ${pct(favP)}.`));
    return out;
  }
  if (!pred) return out;
  if (m.state === 'in' && pred.live) {
    const L = pred.live, min = m.minute ?? 0, left = Math.max(0, 90 - min);
    const ranked = [['pH', m.h], ['pD', null], ['pA', m.a]].sort((a, b) => L[b[0]] - L[a[0]]);
    const [topK, topId] = ranked[0];
    const lead = m.hg === m.ag ? null : m.hg > m.ag ? m.h : m.a;
    out.push(item('tagLive', PT()
      ? `${H} ${m.hg}–${m.ag} ${A} aos ${esc(m.clock || min + "'")}. Antes do jogo o modelo previa: vitória ${d(teams, m.h)} ${pct(pred.pH)}, empate ${pct(pred.pD)}, vitória ${d(teams, m.a)} ${pct(pred.pA)}. Agora: ${pct(L.pH)}, ${pct(L.pD)} e ${pct(L.pA)}.`
      : `${H} ${m.hg}–${m.ag} ${A} at ${esc(m.clock || min + "'")}. Before kick-off the model had ${H} win ${pct(pred.pH)}, draw ${pct(pred.pD)}, ${A} win ${pct(pred.pA)}. Now it is ${pct(L.pH)}, ${pct(L.pD)} and ${pct(L.pA)}.`));
    const what = topK === 'pD' ? (PT() ? `o empate é o desfecho mais provável (${pct(L.pD)})` : `a draw is now the most likely outcome (${pct(L.pD)})`)
      : PT() ? `a vitória ${d(teams, topId)} é o desfecho mais provável (${pct(L[topK])})` : `${nm(teams, topId)} winning is now the most likely outcome (${pct(L[topK])})`;
    out.push(item('tagLive', PT()
      ? `Com cerca de ${left} minutos mais acréscimos pela frente, ${what}. O modelo ainda espera cerca de ${num(L.lhLeft + L.laLeft, 1)} gols até o apito final${lead ? `, e ${o(teams, lead)} precisa segurar a vantagem` : ''}.`
      : `With about ${left} minutes plus stoppage time left, ${what}. The model still expects around ${num(L.lhLeft + L.laLeft, 1)} more goals${lead ? `, and ${nm(teams, lead)} need to protect their lead` : ''}.`));
    if (model) {
      const ifH = predictLive(model, m.h, m.a, m.hg + 1, m.ag, min, m.neutral), ifA = predictLive(model, m.h, m.a, m.hg, m.ag + 1, min, m.neutral);
      out.push(item('tagLive', PT()
        ? `Próximo gol: se ${o(teams, m.h)} marcar, a chance de vitória ${d(teams, m.h)} vai a ${pct(ifH.pH)}; se ${o(teams, m.a)} marcar, a ${d(teams, m.a)} vai a ${pct(ifA.pA)}.`
        : `Next goal: if ${H} score, their win chance jumps to ${pct(ifH.pH)}; if ${A} score, theirs jumps to ${pct(ifA.pA)}.`));
    }
    return out;
  }
  // Pre-match.
  const when = fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long' });
  out.push(item('tagMatch', PT()
    ? `${H} x ${A} (${when}): o modelo prevê vitória ${d(teams, m.h)} com ${pct(pred.pH)}, empate com ${pct(pred.pD)} e vitória ${d(teams, m.a)} com ${pct(pred.pA)}.`
    : `${H} vs ${A} (${when}): the model gives ${H} a ${pct(pred.pH)} chance of winning, a draw ${pct(pred.pD)} and ${A} ${pct(pred.pA)}.`));
  const gap = pred.pH - pred.pA;
  if (Math.abs(gap) < 0.07) out.push(item('tagMatch', PT() ? 'É um jogo praticamente equilibrado: nenhum lado tem vantagem clara, e o empate é um resultado bem possível.' : 'This is close to a coin-flip: neither side has a clear edge, and a draw is a very live possibility.'));
  if (pred.neutral && !m.neutral) {
    const ngap = pred.neutral.pH - pred.neutral.pA;
    let why;
    if (Math.abs(ngap) < 0.06 && Math.abs(gap) >= 0.07) why = PT() ? `Em campo neutro os dois seriam quase iguais (${pct(pred.neutral.pH)} x ${pct(pred.neutral.pA)}) — o favoritismo ${d(teams, m.h)} vem do mando de campo, não do elenco.` : `On a neutral pitch the sides would be almost level (${pct(pred.neutral.pH)} vs ${pct(pred.neutral.pA)}) — ${H}’s edge comes from playing at home, not from a stronger squad.`;
    else if (ngap < -0.06 && gap >= 0) why = Math.abs(gap) < 0.07
      ? (PT() ? `Em campo neutro ${o(teams, m.a)} seria favorito (${pct(pred.neutral.pA)} x ${pct(pred.neutral.pH)}); jogar em casa é o que deixa o confronto equilibrado.` : `On a neutral pitch ${A} would be favourites (${pct(pred.neutral.pA)} vs ${pct(pred.neutral.pH)}); playing at home is what levels the contest for ${H}.`)
      : (PT() ? `${O(teams, m.a)} tem o time mais forte segundo as notas do modelo, mas o fator casa é suficiente para inverter o favoritismo.` : `${A} rate as the stronger side, but home advantage is enough to tip the odds toward ${H}.`);
    else if (Math.abs(ngap) >= 0.06) { const s = ngap > 0 ? m.h : m.a; why = PT() ? `Mesmo em campo neutro ${o(teams, s)} seria favorito (${pct(Math.max(pred.neutral.pH, pred.neutral.pA))}) — a diferença é de qualidade, e o mando ${gap * ngap > 0 ? 'só reforça' : 'reduz'} isso.` : `Even on a neutral pitch ${nm(teams, s)} would be favourites (${pct(Math.max(pred.neutral.pH, pred.neutral.pA))}) — this is about quality, and the venue ${gap * ngap > 0 ? 'only adds to it' : 'narrows it'}.`; }
    if (why) out.push(item('tagMatch', why));
  }
  const s = pred.top?.[0], s2 = pred.top?.[1];
  if (s) out.push(item('tagMatch', PT()
    ? `Gols esperados: ${num(pred.lh, 2)} para ${o(teams, m.h)} e ${num(pred.la, 2)} para ${o(teams, m.a)}. Placares mais prováveis: ${s.h}–${s.a} (${pct(s.p)})${s2 ? ` e ${s2.h}–${s2.a} (${pct(s2.p)})` : ''}. Chance de mais de 2,5 gols: ${pct(pred.over25)}; de ambos marcarem: ${pct(pred.btts)}.`
    : `Expected goals: ${num(pred.lh, 2)} for ${H} and ${num(pred.la, 2)} for ${A}. Most likely scores: ${s.h}–${s.a} (${pct(s.p)})${s2 ? ` and ${s2.h}–${s2.a} (${pct(s2.p)})` : ''}. Over 2.5 goals: ${pct(pred.over25)}; both teams to score: ${pct(pred.btts)}.`));
  return out;
}

// ---------- what the next result means ----------
export function stakesInsight(id, teams, cond) {
  if (!cond?.W) return [];
  const opp = cond.h === id ? cond.a : cond.h;
  const z = r => cond[r].zones.relegation;
  const swing = z('L') - z('W');
  return [item('tagStakes', PT()
    ? `O que está em jogo contra ${o(teams, opp)}: com vitória, o risco de rebaixamento ${d(teams, id)} cai para ${pct(z('W'))}; com empate fica em ${pct(z('D'))}; com derrota sobe para ${pct(z('L'))}. A diferença entre vencer e perder é de ${pp(swing)} no risco de rebaixamento.`
    : `What’s at stake against ${nm(teams, opp)}: a win would cut ${nm(teams, id)}’s relegation risk to ${pct(z('W'))}, a draw would leave it at ${pct(z('D'))}, and a defeat would push it to ${pct(z('L'))}. The gap between winning and losing is ${pp(swing)} of relegation risk.`)];
}

// ---------- season summary ----------
export function outlookInsight(id, teams, table, sim, remaining, trend) {
  const row = table?.find(r => r.id === id);
  if (!row || !sim?.teams?.[id]) return [];
  const out = [], T = nm(teams, id), s = sim.teams[id];
  const zr = s.zones.relegation, left = remaining ?? 0;
  const ppg = row.gp ? row.pts / row.gp : 0;
  const sixteenth = table[15], seventeenth = table[16];
  const gapTxt = row.rank > 16
    ? (PT() ? `${ordinal(row.rank)} lugar, ${pts(sixteenth.pts - row.pts)} atrás ${d(teams, sixteenth.id)}, o primeiro time fora do Z4` : `in ${ordinal(row.rank)} place, ${pts(sixteenth.pts - row.pts)} behind ${nm(teams, sixteenth.id)}, the first club outside the drop zone`)
    : (PT() ? `${ordinal(row.rank)} lugar, ${pts(row.pts - seventeenth.pts)} acima do Z4` : `in ${ordinal(row.rank)} place, ${pts(row.pts - seventeenth.pts)} clear of the drop zone`);
  out.push(item('tagOutlook', PT()
    ? `${O(teams, id)} está em ${gapTxt}, com ${row.pts} pontos em ${row.gp} jogos e ${left} rodadas por disputar.`
    : `${T} are ${gapTxt}, with ${row.pts} points from ${row.gp} games and ${left} still to play.`));
  if (sim.safety && left > 0) {
    const need = Math.max(0, sim.safety.p50 + 1 - row.pts), req = need / left;
    const cmp = req > ppg + 0.1 ? (PT() ? `bem acima do ritmo atual de ${num(ppg, 2)} por jogo — será preciso melhorar` : `well above their current pace of ${num(ppg, 2)} per game — they need to improve`)
      : req < ppg - 0.1 ? (PT() ? `abaixo do ritmo atual de ${num(ppg, 2)} por jogo — manter o nível deve bastar` : `below their current pace of ${num(ppg, 2)} per game — keeping this level should be enough`)
      : (PT() ? `praticamente o ritmo atual de ${num(ppg, 2)} por jogo` : `roughly their current pace of ${num(ppg, 2)} per game`);
    out.push(item('tagOutlook', PT()
      ? `Nas simulações, o 16º colocado termina normalmente com ${sim.safety.p50} pontos (entre ${sim.safety.p10} e ${sim.safety.p90} em 80% dos casos). Para superar essa marca, ${o(teams, id)} precisa de cerca de ${pts(need)} — ${num(req, 2)} por jogo, ${cmp}.`
      : `In the simulations the 16th-placed club usually finishes on ${sim.safety.p50} points (between ${sim.safety.p10} and ${sim.safety.p90} in 80% of runs). To beat that, ${T} need about ${need} more ${need === 1 ? 'point' : 'points'} — ${num(req, 2)} per game, ${cmp}.`));
  }
  out.push(item('tagOutlook', PT()
    ? `Resultado das ${num(sim.sims)} simulações: ${o(teams, id)} é rebaixado em ${pct(zr)} delas e termina, em média, com ${num(s.xPts)} pontos.`
    : `Across ${num(sim.sims)} simulated seasons, ${T} are relegated in ${pct(zr)} of them and finish on ${num(s.xPts)} points on average.`));
  if (trend?.length > 2) {
    const prev = trend.at(-2)?.[id]?.relegation, first = trend.find(p => p[id])?.[id]?.relegation;
    const bits = [];
    if (prev != null && Math.abs(zr - prev) >= 0.02) bits.push(PT() ? `${zr > prev ? 'subiu' : 'caiu'} ${pp(zr - prev)} na última semana` : `has ${zr > prev ? 'risen' : 'fallen'} ${pp(zr - prev)} in the last week`);
    if (first != null) bits.push(PT() ? `no início da temporada era de ${pct(first)}` : `at the start of the season it was ${pct(first)}`);
    if (bits.length) out.push(item('tagOutlook', PT() ? `O risco de rebaixamento ${bits.join('; ')}.` : `The relegation risk ${bits.join('; ')}.`));
  }
  return out;
}

// ---------- form ----------
export function formInsight(id, teams, matches, season) {
  const games = matches.filter(m => m.done && m.season === season && (m.h === id || m.a === id));
  if (games.length < 6) return [];
  const res = games.map(m => { const gf = m.h === id ? m.hg : m.ag, ga = m.h === id ? m.ag : m.hg; return { gf, ga, p: gf > ga ? 3 : gf === ga ? 1 : 0 }; });
  const last = res.slice(-5), pts5 = last.reduce((a, r) => a + r.p, 0), gf5 = last.reduce((a, r) => a + r.gf, 0), ga5 = last.reduce((a, r) => a + r.ga, 0);
  const ppgAll = res.reduce((a, r) => a + r.p, 0) / res.length, ppg5 = pts5 / 5;
  let winless = 0; for (let i = res.length - 1; i >= 0 && res[i].p < 3; i--) winless++;
  let unbeaten = 0; for (let i = res.length - 1; i >= 0 && res[i].p > 0; i--) unbeaten++;
  const T = nm(teams, id), out = [];
  const trendTxt = ppg5 > ppgAll + 0.25 ? (PT() ? 'melhor do que a média da temporada' : 'better than their season average')
    : ppg5 < ppgAll - 0.25 ? (PT() ? 'pior do que a média da temporada' : 'worse than their season average') : (PT() ? 'em linha com a média da temporada' : 'in line with their season average');
  out.push(item('tagForm', PT()
    ? `Nos últimos 5 jogos do campeonato, ${o(teams, id)} somou ${pts5} de 15 pontos (${num(ppg5, 1)} por jogo), ${trendTxt} (${num(ppgAll, 2)}). Marcou ${gf5} e sofreu ${ga5} gols nesse período.`
    : `In their last 5 league games ${T} took ${pts5} points out of 15 (${num(ppg5, 1)} per game), ${trendTxt} of ${num(ppgAll, 2)}. They scored ${gf5} and conceded ${ga5} in that run.`));
  if (winless >= 4) out.push(item('tagForm', PT() ? `${O(teams, id)} não vence há ${winless} rodadas.` : `${T} have gone ${winless} league games without a win.`));
  else if (unbeaten >= 4) out.push(item('tagForm', PT() ? `${O(teams, id)} está invicto há ${unbeaten} rodadas.` : `${T} are unbeaten in ${unbeaten} league games.`));
  return out;
}

// ---------- luck: actual points vs points expected from pre-match odds ----------
export function luckInsight(id, teams, matches, prior, season) {
  let xp = 0, pts = 0, n = 0;
  for (const m of matches) {
    if (!m.done || m.season !== season || (m.h !== id && m.a !== id) || !prior[m.id]) continue;
    const p = prior[m.id], home = m.h === id;
    xp += 3 * (home ? p.pH : p.pA) + p.pD;
    const gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0; n++;
  }
  if (n < 8) return [];
  const diff = pts - xp, T = nm(teams, id);
  const verdict = Math.abs(diff) < 2.5 ? (PT() ? 'O desempenho está praticamente dentro do esperado.' : 'Their results are almost exactly what the odds suggested.')
    : diff > 0 ? (PT() ? `Está ${num(diff, 1)} pontos acima do esperado — os resultados foram melhores do que o futebol apresentado sugeria.` : `That is ${num(diff, 1)} points above expectation — results have outrun the underlying quality.`)
    : (PT() ? `Está ${num(-diff, 1)} pontos abaixo do esperado — há algum azar no meio, e o modelo espera uma recuperação parcial.` : `That is ${num(-diff, 1)} points below expectation — some bad luck is involved, and the model expects partial recovery.`);
  return [item('tagLuck', PT()
    ? `Somando as probabilidades pré-jogo de cada partida, um time na situação ${d(teams, id)} teria feito cerca de ${num(xp, 1)} pontos em ${n} jogos; ${o(teams, id)} fez ${pts}. ${verdict}`
    : `Adding up the pre-match odds of each game, a side in ${T}’s position would have collected about ${num(xp, 1)} points from ${n} games; ${T} have ${pts}. ${verdict}`)];
}

// ---------- run-in: remaining league fixtures ----------
export function runInInsight(id, teams, matches, preds, sim, season) {
  const fx = matches.filter(m => !m.done && m.season === season && (m.h === id || m.a === id) && preds[m.id]);
  if (fx.length < 2) return [];
  const rows = fx.map(m => { const p = preds[m.id], home = m.h === id; return { m, home, opp: home ? m.a : m.h, w: home ? p.pH : p.pA, x: 3 * (home ? p.pH : p.pA) + p.pD }; });
  const xpts = rows.reduce((a, r) => a + r.x, 0), homes = rows.filter(r => r.home).length;
  const hard = [...rows].sort((a, b) => a.w - b.w)[0], easy = [...rows].sort((a, b) => b.w - a.w)[0];
  const rivals = rows.filter(r => { const z = sim?.teams?.[r.opp]?.zones?.relegation; return z != null && z > 0.1 && z < 0.95; });
  const out = [], T = nm(teams, id);
  const ven = r => (PT() ? (r.home ? 'em casa' : 'fora') : (r.home ? 'at home' : 'away'));
  out.push(item('tagRunIn', PT()
    ? `Restam ${rows.length} jogos (${homes} em casa). Pela previsão de cada um, ${o(teams, id)} deve somar cerca de ${num(xpts, 1)} pontos (${num(xpts / rows.length, 2)} por jogo). O jogo mais difícil: ${o(teams, hard.opp)} ${ven(hard)} (${pct(hard.w)} de chance de vitória). O mais favorável: ${o(teams, easy.opp)} ${ven(easy)} (${pct(easy.w)}).`
    : `${rows.length} games remain (${homes} at home). Adding up each forecast, ${T} should collect about ${num(xpts, 1)} points (${num(xpts / rows.length, 2)} per game). Toughest: ${nm(teams, hard.opp)} ${ven(hard)} (${pct(hard.w)} win chance). Most winnable: ${nm(teams, easy.opp)} ${ven(easy)} (${pct(easy.w)}).`));
  if (rivals.length) out.push(item('tagRunIn', PT()
    ? `Confrontos diretos contra quem também briga contra o rebaixamento: ${rivals.map(r => `${o(teams, r.opp)} ${ven(r)} (${fmtDate(r.m.date, { day: 'numeric', month: 'short' })})`).join(', ')}. Esses jogos valem em dobro, porque tiram pontos de um rival.`
    : `Six-pointers against fellow strugglers: ${rivals.map(r => `${nm(teams, r.opp)} ${ven(r)} (${fmtDate(r.m.date, { day: 'numeric', month: 'short' })})`).join(', ')}. These count double, because points taken also come off a rival.`));
  return out;
}

// ---------- Grêmio vs Inter in the final table ----------
export function rivalryInsight(a, b, teams, sim) {
  const p = sim?.finishAbove?.[a]?.[b];
  if (p == null) return [];
  const za = sim.teams[a]?.zones?.relegation ?? 0, zb = sim.teams[b]?.zones?.relegation ?? 0;
  return [item('tagRival', PT()
    ? `Quem termina na frente? ${O(teams, a)} fica acima ${d(teams, b)} na tabela final em ${pct(p)} das simulações; ${o(teams, b)} fica acima em ${pct(1 - p)}. Risco de rebaixamento: ${nm(teams, a)} ${pct(za)}, ${nm(teams, b)} ${pct(zb)}.`
    : `Who finishes higher? ${nm(teams, a)} end above ${nm(teams, b)} in ${pct(p)} of simulated seasons; ${nm(teams, b)} finish above in ${pct(1 - p)}. Relegation risk: ${nm(teams, a)} ${pct(za)}, ${nm(teams, b)} ${pct(zb)}.`)];
}

// ---------- the whole relegation race ----------
export function raceInsight(teams, sim, table) {
  if (!sim || !table) return [];
  const race = table.map(r => ({ id: r.id, z: sim.teams[r.id]?.zones?.relegation ?? 0 })).filter(r => r.z >= 0.03).sort((a, b) => b.z - a.z);
  if (race.length < 4) return [];
  const sure = race.filter(r => r.z >= 0.95), fight = race.filter(r => r.z < 0.95);
  const list = fight.map(r => `${nm(teams, r.id)} ${pct(r.z)}`).join(', ');
  return [item('tagRace', PT()
    ? `${sure.length ? `${sure.map(r => nm(teams, r.id)).join(' e ')} já ${sure.length > 1 ? 'estão' : 'está'} praticamente rebaixado${sure.length > 1 ? 's' : ''}. ` : ''}A briga pelas vagas restantes do Z4: ${list}. Cada número é a chance de terminar entre 17º e 20º.`
    : `${sure.length ? `${sure.map(r => nm(teams, r.id)).join(' and ')} ${sure.length > 1 ? 'are' : 'is'} all but relegated. ` : ''}The fight for the remaining drop places: ${list}. Each figure is that club’s chance of finishing 17th–20th.`)];
}

// ---------- live match statistics ----------
export function statsInsight(sum, teams) {
  if (!sum?.stats || !sum.home || !sum.away) return [];
  const H = sum.home, A = sum.away, s = sum.stats;
  const g = (id, k) => +(s[id]?.[k] ?? NaN);
  const out = [];
  const pos = g(H, 'possessionPct'), shH = g(H, 'totalShots'), shA = g(A, 'totalShots'), otH = g(H, 'shotsOnTarget'), otA = g(A, 'shotsOnTarget');
  if (!isNaN(pos) && !isNaN(shH)) {
    const ctrl = pos >= 58 ? H : pos <= 42 ? A : null;
    const chances = otH - otA >= 3 ? H : otA - otH >= 3 ? A : null;
    const p1 = ctrl ? (PT() ? `${O(teams, ctrl)} controla a bola (${num(ctrl === H ? pos : 100 - pos)}% de posse)` : `${nm(teams, ctrl)} have controlled the ball (${num(ctrl === H ? pos : 100 - pos)}% possession)`)
      : (PT() ? `A posse está dividida (${num(pos)}% x ${num(100 - pos)}%)` : `Possession has been shared (${num(pos)}% vs ${num(100 - pos)}%)`);
    const p2 = chances ? (PT() ? `mas quem cria mais é ${o(teams, chances)}` : `and the clearer chances belong to ${nm(teams, chances)}`)
      : (PT() ? 'e as chances claras estão equilibradas' : 'and clear chances have been even');
    out.push(item('tagStats', PT()
      ? `${p1}, ${p2}: finalizações ${shH} x ${shA}, no alvo ${otH} x ${otA}.`
      : `${p1}, ${p2}: shots ${shH}–${shA}, on target ${otH}–${otA}.`));
  }
  const reds = (sum.events || []).filter(e => e.kind === 'red');
  for (const r of reds) out.push(item('tagStats', PT() ? `${O(teams, r.team)} está com um a menos desde os ${esc(r.clock)} (${esc(r.players[0] || '')} expulso).` : `${nm(teams, r.team)} have been down to ten since ${esc(r.clock)} (${esc(r.players[0] || '')} sent off).`));
  return out;
}

export function insightCard(title, items, sub = t('insightsSub')) {
  if (!items.length) return '';
  return `<section class="card glass insight"><div class="card-head"><div><h2><span class="spark" aria-hidden="true">✦</span> ${esc(title)}</h2><p>${esc(sub)}</p></div></div>
    <ul class="ins">${items.map(i => `<li><span class="itag">${esc(i.tag)}</span><span>${i.html}</span></li>`).join('')}</ul></section>`;
}
