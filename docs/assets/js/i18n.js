// English / Portuguese strings, templates ({name} placeholders) and locale-aware formatters.

const STR = {
  en: {
    appName: 'GreNal Lab', tagline: 'Grêmio & Inter, live and by the numbers',
    navHome: 'Today', navClubs: 'Grêmio & Inter', navLeagues: 'Leagues', navModel: 'Model',
    live: 'Live', updated: 'Updated', updating: 'Updating…', offline: 'You appear to be offline — showing the most recent saved data.',
    sourceNote: 'Scores, fixtures and tables come live from ESPN. Every prediction is calculated in your browser by the model described on the Model page.',
    disclaimer: 'Predictions are probabilities, not certainties. Injuries, suspensions, coaching changes and motivation are not in the data.',
    todayMatches: 'Today’s matches', todayMatchesSub: 'Live scores refresh every 30 seconds while games are in play. Tap a match for the match centre.',
    noMatchesToday: 'There are no matches in this competition today.',
    nextMatches: 'Upcoming matches', nextMatchesSub: 'Each bar shows the model’s chance of a home win, a draw and an away win.',
    recentResults: 'Recent results', recentResultsSub: 'With the probability the model gave the actual result before kick-off.',
    standings: 'League table', standingsSub: 'Official table. “Proj. pts” and “Relegation” are the model’s end-of-season forecasts.',
    pos: '#', team: 'Club', played: 'P', won: 'W', drawn: 'D', lost: 'L', gf: 'GF', ga: 'GA', gd: 'GD', pts: 'Pts', form: 'Last 5',
    projPtsCol: 'Proj. pts', relCol: 'Relegation',
    win: 'Win', draw: 'Draw', loss: 'Loss', home: 'Home', away: 'Away',
    winOf: '{team} win', prediction: 'Forecast',
    preForecast: 'Pre-match forecast', liveForecast: 'Live forecast · {min} · {score}', finalNote: 'Final · the model gave this result {p} before kick-off',
    likelyScores: 'Most likely scores', xg: 'Expected goals', over25: 'Over 2.5 goals', btts: 'Both teams score',
    liveWinProb: 'Live forecast', ft: 'Full time', kickoff: 'Kick-off',
    relegation: 'Relegation', sudamericana: 'Sul-Americana', libertadores: 'Libertadores', title: 'Title',
    champions: 'Champions League', europa: 'Europa League', conference: 'Conference League', promotion: 'Promotion', playoff: 'Play-off',
    expPts: 'Projected points', expPos: 'Most likely finish', range80: '80% range',
    tileRel: 'Chance of finishing 17th–20th (relegated to Série B)',
    tileSud: 'Chance of finishing in the top 12 (Sul-Americana or better)',
    tileLib: 'Chance of finishing in the top 6 (Libertadores)',
    tilePts: 'Median final points total · 80% of simulations between {lo} and {hi}',
    tilePos: 'Single most likely final position ({p} of simulations)',
    seasonOutlook: 'Season forecast', seasonOutlookSub: 'Based on {n} simulations of the remaining {left} league matches.',
    pointsTrajectory: 'Where {team}’s points total is heading',
    trajectoryNote: 'Solid line: league points actually won so far. Shaded area: the forecast for the remaining games — the darker band holds the middle 50% of simulated seasons, the lighter band 80%. The horizontal line is the total that usually just keeps a club out of the bottom four.',
    safetyLine: 'Usual safety mark', axisMatches: 'League matches played', axisPoints: 'Points',
    finishDist: 'Where {team} could finish',
    finishNote: 'Each bar is the probability that {team} end the season in that league position. Shaded areas mark the Libertadores, Sul-Americana and relegation places.',
    axisFinal: 'Final league position', axisProb: 'Probability',
    trend: 'How {team}’s chances changed this season',
    trendNote: 'Each point is what the model would have said that week, using only matches played up to then — so you can see how results moved the forecast.',
    trendGrenal: 'Relegation chance through the season: Grêmio vs Inter',
    trendGrenalNote: 'Weekly re-runs of the model using only information available at the time. Higher line = closer to Série B.',
    chanceRel: 'Chance of relegation', chanceTop12: 'Chance of top-12 (Sul-Americana or better)',
    allComps: 'All competitions', noModel: 'No forecast: the model only covers league opponents', vs: 'vs',
    compare: 'Side by side', compareSub: 'Current Brasileirão numbers and the model’s season forecast for both clubs.',
    grenal: 'Gre-Nal', h2h: 'Recent Gre-Nais', h2hSub: 'Every derby in our data window, all competitions.',
    strength: 'Attack and defence ratings',
    strengthNote: 'How many goals each club would be expected to score and concede per match against an average Série A side on a neutral ground. Right = stronger attack; higher = stronger defence.',
    clubStrengthNote: 'Model ratings, in goals per match against an average Série A opponent on a neutral ground.',
    attack: 'Attack', defence: 'Defence', homeAdv: 'Home advantage',
    attackDesc: 'Goals scored per match vs an average side', defenceDesc: 'Goals conceded per match (lower is better)', homeDesc: 'Extra goals scored at home',
    league: 'League', selectLeague: 'Choose a competition', fixtures: 'Fixtures and results',
    projections: 'Final-position probabilities for every club',
    projectionsNote: 'Each row is a club and each cell is the chance (in %) that it finishes in that position, from {n} simulations of the remaining fixtures. Darker = more likely. Sorted by projected points.',
    modelTitle: 'How the model works', modelSub: 'What it predicts, how it is built and how accurate it has been.',
    accuracy: 'Track record', accuracySub: 'Every match since {from} was predicted using only data available before kick-off, then compared with what happened.',
    calibration: 'Are the probabilities honest?',
    calibrationNote: 'Predictions are grouped by the probability the model gave (across). The height shows how often that outcome really happened. Points near the diagonal mean that when the model says 40%, it happens about 40% of the time.',
    axisPred: 'Model probability (%)', axisObs: 'How often it happened (%)',
    rps: 'Ranked probability score', logLoss: 'Log loss', hitRate: 'Correct favourite', baseline: 'Baseline', matchesTested: 'Matches tested',
    rpsDesc: 'Lower is better · baseline {b}', llDesc: 'Lower is better · baseline {b}', hitDesc: 'Most likely result came true · baseline {b}', testedDesc: 'From {from} to today',
    rpsNote: 'The baseline always predicts the league’s historical home-win, draw and away-win rates. Beating it shows the model has learned real differences between clubs.',
    better: 'better than baseline',
    leagueStats: 'Brasileirão {season} in numbers', leagueStatsSub: 'Season averages used to sanity-check the model.',
    method1: 'What it predicts. For every match, the model estimates how many goals each side is likely to score. From those two numbers it derives the probability of every scoreline — and therefore of a home win, a draw and an away win.',
    method2: 'How it learns. Each club gets an attack rating and a defence rating, plus a league-wide and a club-specific home advantage (the Dixon–Coles model, with its correction for 0–0, 1–0, 0–1 and 1–1 results). Ratings are fitted to the last three-plus seasons; older matches count less (half-life about 19 months) and small samples are pulled toward the league average so a few lucky results don’t mislead it. Newly promoted clubs start slightly below average.',
    method3: 'Season forecasts. The remaining fixtures are played out 10,000 times. In each run, team strengths are redrawn within their uncertainty, every match is simulated, and the final table is recorded. A 62% relegation chance means the club finished 17th–20th in 62% of those runs.',
    method4: 'Live forecasts. During a match, the model keeps the current score and simulates only the minutes that remain, so probabilities move with every goal.',
    method5: 'Limits. Football is noisy: even the best models pick the right result only about half the time. Team news, injuries, suspensions, coaching changes and motivation are not in the data — treat every number as a probability, not a promise.',
    computing: 'Running the model…', loading: 'Loading the latest data…', error: 'We could not load data right now. The site will try again automatically.',
    language: 'Language', theme: 'Appearance', auto: 'Automatic', light: 'Light', dark: 'Dark',
    postponed: 'Postponed', scheduled: 'Scheduled', round: 'Round', showAll: 'Show all', showLess: 'Show less',
    matchesLeft: 'league matches left', simSeasons: 'simulated seasons',
    points: 'Points won', pointsForecast: 'Forecast (median)', bands: '50% / 80% range', position: 'Position', date: 'Date', result: 'Result',
    preMatch: 'Pre-match', surprise: 'Upset', expected: 'Expected', inPlay: 'In play',
    noData: 'No data available yet.', table: 'Table', chart: 'Chart',
    cupNote: 'Cup and group competitions show fixtures and results only — the model needs a league where every club meets common opponents.',
    goals: 'Goals', avgGoals: 'Goals per match', homeWinRate: 'Home wins', drawRate: 'Draws',
    insights: 'What the model is saying', insightsSub: 'Written automatically from the live numbers on this page.',
    tagLive: 'Live', tagMatch: 'Next match', tagStakes: 'Stakes', tagOutlook: 'Season', tagForm: 'Form', tagLuck: 'Luck', tagRunIn: 'Run-in', tagRival: 'Rivalry', tagRace: 'Relegation race', tagResult: 'Result', tagStats: 'Match stats',
    matchCentre: 'Match centre', openMatch: 'Open match centre', back: 'Back',
    winProbTimeline: 'How the forecast moved during the match',
    winProbNote: 'At each minute: the chance of a home win, a draw and an away win given the score at that moment and the time left. Vertical lines mark goals.',
    axisMinute: 'Minute', keyEvents: 'Key moments', matchStats: 'Match statistics', lineups: 'Line-ups', starters: 'Starting XI', subs: 'Substitutes',
    commentary: 'Live commentary', commentaryNote: 'Provided by ESPN (in English).',
    goal: 'Goal', yellow: 'Yellow card', red: 'Red card', sub: 'Substitution', ownGoal: 'Own goal', penalty: 'Penalty',
    st_possessionPct: 'Possession', st_totalShots: 'Shots', st_shotsOnTarget: 'Shots on target', st_wonCorners: 'Corners', st_foulsCommitted: 'Fouls',
    st_yellowCards: 'Yellow cards', st_redCards: 'Red cards', st_saves: 'Saves', st_offsides: 'Offsides', st_accuratePasses: 'Accurate passes', st_passPct: 'Pass accuracy',
    notStarted: 'The match has not started yet. Line-ups usually appear about an hour before kick-off.',
  },
  pt: {
    appName: 'GreNal Lab', tagline: 'Grêmio e Inter, ao vivo e em números',
    navHome: 'Hoje', navClubs: 'Grêmio & Inter', navLeagues: 'Ligas', navModel: 'Modelo',
    live: 'Ao vivo', updated: 'Atualizado', updating: 'Atualizando…', offline: 'Parece que você está sem conexão — exibindo os últimos dados salvos.',
    sourceNote: 'Placares, jogos e tabelas chegam ao vivo da ESPN. Todas as previsões são calculadas no seu navegador pelo modelo descrito na página Modelo.',
    disclaimer: 'Previsões são probabilidades, não certezas. Lesões, suspensões, trocas de técnico e motivação não estão nos dados.',
    todayMatches: 'Jogos de hoje', todayMatchesSub: 'Os placares ao vivo são atualizados a cada 30 segundos durante as partidas. Toque em um jogo para abrir a central.',
    noMatchesToday: 'Não há jogos desta competição hoje.',
    nextMatches: 'Próximos jogos', nextMatchesSub: 'Cada barra mostra a chance de vitória do mandante, de empate e de vitória do visitante segundo o modelo.',
    recentResults: 'Resultados recentes', recentResultsSub: 'Com a probabilidade que o modelo dava ao resultado antes do apito inicial.',
    standings: 'Classificação', standingsSub: 'Tabela oficial. “Pts proj.” e “Rebaixamento” são previsões do modelo para o fim da temporada.',
    pos: '#', team: 'Clube', played: 'J', won: 'V', drawn: 'E', lost: 'D', gf: 'GP', ga: 'GC', gd: 'SG', pts: 'Pts', form: 'Últimos 5',
    projPtsCol: 'Pts proj.', relCol: 'Rebaixamento',
    win: 'Vitória', draw: 'Empate', loss: 'Derrota', home: 'Casa', away: 'Fora',
    winOf: 'Vitória do {team}', prediction: 'Previsão',
    preForecast: 'Previsão pré-jogo', liveForecast: 'Previsão ao vivo · {min} · {score}', finalNote: 'Encerrado · o modelo dava {p} para este resultado antes do jogo',
    likelyScores: 'Placares mais prováveis', xg: 'Gols esperados', over25: 'Mais de 2,5 gols', btts: 'Ambos marcam',
    liveWinProb: 'Previsão ao vivo', ft: 'Encerrado', kickoff: 'Início',
    relegation: 'Rebaixamento', sudamericana: 'Sul-Americana', libertadores: 'Libertadores', title: 'Título',
    champions: 'Liga dos Campeões', europa: 'Liga Europa', conference: 'Liga Conferência', promotion: 'Acesso', playoff: 'Repescagem',
    expPts: 'Pontos projetados', expPos: 'Posição mais provável', range80: 'Faixa de 80%',
    tileRel: 'Chance de terminar entre 17º e 20º (rebaixado para a Série B)',
    tileSud: 'Chance de terminar no top 12 (Sul-Americana ou melhor)',
    tileLib: 'Chance de terminar no top 6 (Libertadores)',
    tilePts: 'Pontuação final mediana · 80% das simulações entre {lo} e {hi}',
    tilePos: 'Posição final mais provável ({p} das simulações)',
    seasonOutlook: 'Previsão da temporada', seasonOutlookSub: 'Com base em {n} simulações dos {left} jogos restantes do campeonato.',
    pointsTrajectory: 'Para onde vai a pontuação do {team}',
    trajectoryNote: 'Linha contínua: pontos conquistados até agora. Área sombreada: a previsão para os jogos restantes — a faixa mais escura contém os 50% centrais das temporadas simuladas, a mais clara 80%. A linha horizontal é a pontuação que normalmente basta para escapar dos quatro últimos.',
    safetyLine: 'Pontuação usual de segurança', axisMatches: 'Jogos disputados no campeonato', axisPoints: 'Pontos',
    finishDist: 'Onde o {team} pode terminar',
    finishNote: 'Cada barra é a probabilidade de o {team} terminar a temporada naquela posição. As áreas sombreadas marcam as vagas de Libertadores, Sul-Americana e rebaixamento.',
    axisFinal: 'Posição final no campeonato', axisProb: 'Probabilidade',
    trend: 'Como as chances do {team} mudaram na temporada',
    trendNote: 'Cada ponto é o que o modelo diria naquela semana, usando apenas os jogos disputados até então — dá para ver como os resultados mexeram na previsão.',
    trendGrenal: 'Chance de rebaixamento ao longo da temporada: Grêmio x Inter',
    trendGrenalNote: 'O modelo refeito semana a semana só com as informações da época. Linha mais alta = mais perto da Série B.',
    chanceRel: 'Chance de rebaixamento', chanceTop12: 'Chance de top 12 (Sul-Americana ou melhor)',
    allComps: 'Todas as competições', noModel: 'Sem previsão: o modelo só cobre adversários da liga', vs: 'x',
    compare: 'Lado a lado', compareSub: 'Números atuais do Brasileirão e a previsão do modelo para os dois clubes.',
    grenal: 'Gre-Nal', h2h: 'Gre-Nais recentes', h2hSub: 'Todos os clássicos no nosso período de dados, em todas as competições.',
    strength: 'Notas de ataque e defesa',
    strengthNote: 'Quantos gols cada clube deveria marcar e sofrer por jogo contra um time médio da Série A em campo neutro. Mais à direita = ataque mais forte; mais alto = defesa mais forte.',
    clubStrengthNote: 'Notas do modelo, em gols por jogo contra um adversário médio da Série A em campo neutro.',
    attack: 'Ataque', defence: 'Defesa', homeAdv: 'Fator casa',
    attackDesc: 'Gols marcados por jogo contra um time médio', defenceDesc: 'Gols sofridos por jogo (menor é melhor)', homeDesc: 'Gols a mais marcados em casa',
    league: 'Liga', selectLeague: 'Escolha uma competição', fixtures: 'Jogos e resultados',
    projections: 'Probabilidade de posição final de cada clube',
    projectionsNote: 'Cada linha é um clube e cada célula é a chance (em %) de terminar naquela posição, a partir de {n} simulações dos jogos restantes. Mais escuro = mais provável. Ordenado pelos pontos projetados.',
    modelTitle: 'Como o modelo funciona', modelSub: 'O que ele prevê, como foi construído e qual tem sido sua precisão.',
    accuracy: 'Histórico de acertos', accuracySub: 'Cada jogo desde {from} foi previsto apenas com dados disponíveis antes do apito inicial e depois comparado com o que aconteceu.',
    calibration: 'As probabilidades são honestas?',
    calibrationNote: 'As previsões são agrupadas pela probabilidade dada pelo modelo (eixo horizontal). A altura mostra com que frequência aquele resultado realmente aconteceu. Pontos perto da diagonal significam que, quando o modelo diz 40%, acontece cerca de 40% das vezes.',
    axisPred: 'Probabilidade do modelo (%)', axisObs: 'Com que frequência aconteceu (%)',
    rps: 'Ranked probability score', logLoss: 'Log loss', hitRate: 'Favorito acertado', baseline: 'Referência', matchesTested: 'Jogos testados',
    rpsDesc: 'Menor é melhor · referência {b}', llDesc: 'Menor é melhor · referência {b}', hitDesc: 'O resultado mais provável aconteceu · referência {b}', testedDesc: 'De {from} até hoje',
    rpsNote: 'A referência sempre prevê as taxas históricas da liga de vitória do mandante, empate e vitória do visitante. Superá-la mostra que o modelo aprendeu diferenças reais entre os clubes.',
    better: 'melhor que a referência',
    leagueStats: 'Brasileirão {season} em números', leagueStatsSub: 'Médias da temporada usadas para conferir o modelo.',
    method1: 'O que ele prevê. Para cada jogo, o modelo estima quantos gols cada time deve marcar. Desses dois números ele tira a probabilidade de cada placar — e, portanto, de vitória do mandante, empate e vitória do visitante.',
    method2: 'Como ele aprende. Cada clube tem uma nota de ataque e uma de defesa, além do fator casa da liga e de cada clube (o modelo de Dixon–Coles, com sua correção para 0–0, 1–0, 0–1 e 1–1). As notas são ajustadas com as últimas três temporadas ou mais; jogos antigos pesam menos (meia-vida de cerca de 19 meses) e amostras pequenas são puxadas para a média da liga, para que alguns resultados de sorte não enganem o modelo. Clubes recém-promovidos começam um pouco abaixo da média.',
    method3: 'Previsão da temporada. Os jogos restantes são disputados 10.000 vezes. Em cada simulação, a força dos times é sorteada dentro da sua incerteza, cada jogo é simulado e a tabela final é registrada. 62% de chance de rebaixamento significa que o clube terminou entre 17º e 20º em 62% dessas simulações.',
    method4: 'Previsão ao vivo. Durante o jogo, o modelo mantém o placar atual e simula apenas os minutos restantes, então as probabilidades mudam a cada gol.',
    method5: 'Limites. Futebol é imprevisível: mesmo os melhores modelos acertam o resultado só cerca de metade das vezes. Escalações, lesões, suspensões, trocas de técnico e motivação não estão nos dados — trate cada número como probabilidade, não como promessa.',
    computing: 'Rodando o modelo…', loading: 'Carregando os dados mais recentes…', error: 'Não foi possível carregar os dados agora. O site tentará de novo automaticamente.',
    language: 'Idioma', theme: 'Aparência', auto: 'Automático', light: 'Claro', dark: 'Escuro',
    postponed: 'Adiado', scheduled: 'Agendado', round: 'Rodada', showAll: 'Ver tudo', showLess: 'Ver menos',
    matchesLeft: 'jogos restantes no campeonato', simSeasons: 'temporadas simuladas',
    points: 'Pontos conquistados', pointsForecast: 'Previsão (mediana)', bands: 'Faixas de 50% / 80%', position: 'Posição', date: 'Data', result: 'Resultado',
    preMatch: 'Pré-jogo', surprise: 'Zebra', expected: 'Esperado', inPlay: 'Em andamento',
    noData: 'Ainda não há dados disponíveis.', table: 'Tabela', chart: 'Gráfico',
    cupNote: 'Copas e competições com grupos mostram apenas jogos e resultados — o modelo precisa de uma liga em que todos enfrentem adversários em comum.',
    goals: 'Gols', avgGoals: 'Gols por jogo', homeWinRate: 'Vitórias do mandante', drawRate: 'Empates',
    insights: 'O que o modelo está dizendo', insightsSub: 'Texto gerado automaticamente a partir dos números ao vivo desta página.',
    tagLive: 'Ao vivo', tagMatch: 'Próximo jogo', tagStakes: 'O que está em jogo', tagOutlook: 'Temporada', tagForm: 'Momento', tagLuck: 'Sorte', tagRunIn: 'Reta final', tagRival: 'Rivalidade', tagRace: 'Luta contra o Z4', tagResult: 'Resultado', tagStats: 'Estatísticas',
    matchCentre: 'Central do jogo', openMatch: 'Abrir central do jogo', back: 'Voltar',
    winProbTimeline: 'Como a previsão mudou durante o jogo',
    winProbNote: 'A cada minuto: a chance de vitória do mandante, empate e vitória do visitante, dado o placar naquele momento e o tempo restante. As linhas verticais marcam os gols.',
    axisMinute: 'Minuto', keyEvents: 'Lances importantes', matchStats: 'Estatísticas da partida', lineups: 'Escalações', starters: 'Titulares', subs: 'Reservas',
    commentary: 'Narração lance a lance', commentaryNote: 'Fornecida pela ESPN (em inglês).',
    goal: 'Gol', yellow: 'Cartão amarelo', red: 'Cartão vermelho', sub: 'Substituição', ownGoal: 'Gol contra', penalty: 'Pênalti',
    st_possessionPct: 'Posse de bola', st_totalShots: 'Finalizações', st_shotsOnTarget: 'Finalizações no alvo', st_wonCorners: 'Escanteios', st_foulsCommitted: 'Faltas',
    st_yellowCards: 'Cartões amarelos', st_redCards: 'Cartões vermelhos', st_saves: 'Defesas', st_offsides: 'Impedimentos', st_accuratePasses: 'Passes certos', st_passPct: 'Precisão de passe',
    notStarted: 'A partida ainda não começou. As escalações costumam sair cerca de uma hora antes do início.',
  },
};

let lang = (() => {
  try { const s = localStorage.getItem('placar.lang'); if (s === 'en' || s === 'pt') return s; } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
})();

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('placar.lang', l); } catch {}
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en';
}
export const t = k => STR[lang][k] ?? STR.en[k] ?? k;
// Template: tf('winOf', { team: 'Grêmio' }) → "Grêmio win" / "Vitória do Grêmio"
export const tf = (k, vars = {}) => t(k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');

const loc = () => (lang === 'pt' ? 'pt-BR' : 'en-GB');
export const pct = (p, d = 0) => {
  if (p == null || isNaN(p)) return '–';
  if (p > 0 && p < 0.005 && d === 0) return '<1%';
  if (p < 1 && p > 0.995 && d === 0) return '>99%';
  return new Intl.NumberFormat(loc(), { style: 'percent', maximumFractionDigits: d, minimumFractionDigits: d }).format(p);
};
// Percentage-point change, e.g. "12 pts" / "12 p.p."
export const pp = d => { const n = Math.round(Math.abs(d) * 100); return `${n} ${lang === 'pt' ? 'p.p.' : n === 1 ? 'percentage point' : 'percentage points'}`; };
export const pts = n => `${n} ${lang === 'pt' ? (Math.abs(n) === 1 ? 'ponto' : 'pontos') : (Math.abs(n) === 1 ? 'point' : 'points')}`;
export const num = (v, d = 0) => (v == null || isNaN(v) ? '–' : new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v));
export const fmtDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(loc(), opts).format(new Date(iso));
export const fmtTime = iso => new Intl.DateTimeFormat(loc(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const fmtDateTime = iso => `${fmtDate(iso)} · ${fmtTime(iso)}`;
export const ordinal = n => (lang === 'pt' ? `${n}º` : n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'));

// Portuguese club articles: "o Grêmio" / "a Chapecoense" and the contracted forms.
const FEM = /Chapecoense|Ponte Preta|Portuguesa|Ferroviária|Tombense|Caldense/i;
const fem = name => FEM.test(name || '');
export const ptArt = {
  o: n => (fem(n) ? 'a' : 'o'), O: n => (fem(n) ? 'A' : 'O'),
  do: n => (fem(n) ? 'da' : 'do'), no: n => (fem(n) ? 'na' : 'no'), ao: n => (fem(n) ? 'à' : 'ao'),
};
