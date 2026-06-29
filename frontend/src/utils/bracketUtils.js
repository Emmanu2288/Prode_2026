const FINISHED = new Set(["FT", "AET", "PEN"]);

// Orden fijo del sorteo oficial del Mundial 2026 (confirmado por Sky Sports y
// el cuadro de TyC Sports). Posiciones consecutivas (0-1, 2-3, 4-5...) confluyen
// en el mismo cruce de la ronda siguiente, recursivamente, hasta la final — esto
// no depende de resultados ni desempates, solo de quién gana cada cruce.
export const BRACKET_R32_ORDER = [
  ["Germany", "Paraguay"],
  ["France", "Sweden"],
  ["South Africa", "Canada"],
  ["Netherlands", "Morocco"],
  ["Portugal", "Croatia"],
  ["Spain", "Austria"],
  ["USA", "Bosnia & Herzegovina"],
  ["Belgium", "Senegal"],
  ["Brazil", "Japan"],
  ["Ivory Coast", "Norway"],
  ["Mexico", "Ecuador"],
  ["England", "Congo DR"],
  ["Argentina", "Cape Verde Islands"],
  ["Australia", "Egypt"],
  ["Switzerland", "Algeria"],
  ["Colombia", "Ghana"],
];

const ROUND_AFTER = {
  "Round of 32": "Round of 16",
  "Round of 16": "Quarter-finals",
  "Quarter-finals": "Semi-finals",
  "Semi-finals": "Final",
};

const findTeamMeta = (matches, name) => {
  for (const m of matches) {
    if (m.teams.home.name === name) return m.teams.home;
    if (m.teams.away.name === name) return m.teams.away;
  }
  return { name, logo: null };
};

const findFixture = (matches, round, nameA, nameB) => {
  if (!nameA || !nameB) return null;
  return matches.find((m) => {
    if (m.league.round !== round) return false;
    const h = m.teams.home.name, a = m.teams.away.name;
    return (h === nameA && a === nameB) || (h === nameB && a === nameA);
  }) ?? null;
};

const getWinnerName = (fixture) => {
  if (!fixture || !FINISHED.has(fixture.fixture.status.short)) return null;
  if (fixture.teams.home.winner === true) return fixture.teams.home.name;
  if (fixture.teams.away.winner === true) return fixture.teams.away.name;
  return null;
};

const buildMatchup = (matches, round, nameA, nameB) => ({
  round,
  teamA: nameA ? findTeamMeta(matches, nameA) : null,
  teamB: nameB ? findTeamMeta(matches, nameB) : null,
  fixture: findFixture(matches, round, nameA, nameB),
  winner: getWinnerName(findFixture(matches, round, nameA, nameB)),
});

// Construye las 5 rondas eliminatorias completas a partir de los fixtures reales.
// Cada matchup expone teamA/teamB (null si todavía no se sabe quién juega ahí),
// fixture (el partido real si la API ya lo publicó) y winner (si ya se jugó).
// leftSource/rightSource son los 2 matchups de la ronda anterior que alimentan
// a este cruce — se usan para mostrar "Ganador: A vs B" cuando el cupo está
// vacío pero el partido que lo define ya tiene equipos reales conocidos.
export const buildBracket = (matches) => {
  const r32 = BRACKET_R32_ORDER.map(([a, b]) => buildMatchup(matches, "Round of 32", a, b));

  const rounds = { "Round of 32": r32 };
  let prev = r32;
  let round = "Round of 32";

  while (ROUND_AFTER[round]) {
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1];
      next.push({
        ...buildMatchup(matches, ROUND_AFTER[round], left.winner, right.winner),
        leftSource: left,
        rightSource: right,
      });
    }
    round = ROUND_AFTER[round];
    rounds[round] = next;
    prev = next;
  }

  return rounds;
};

// Texto a mostrar para un cupo (teamA o teamB) cuando todavía no hay equipo real:
// "A o B" (predicción, formato corto para que entre en las cajas angostas) si el
// partido que lo define ya tiene los 2 equipos, o null (mostrar "?") si ese
// partido en sí todavía depende de otro resultado.
export const getSlotLabel = (team, source) => {
  if (team) return { text: team.name, isPrediction: false, logo: team.logo };
  if (source?.teamA && source?.teamB) {
    return { text: `${source.teamA.name} o ${source.teamB.name}`, isPrediction: true, logo: null };
  }
  return null;
};
