export const formatRound = (round) => {
  if (!round) return round;
  return round
    .replace("Group Stage - ", "Fase de grupos · Fecha ")
    .replace("Round of 16", "Octavos de final")
    .replace("Quarter-finals", "Cuartos de final")
    .replace("Semi-finals", "Semifinales")
    .replace("3rd Place Final", "3er y 4to puesto")
    .replace("Final", "Final");
};
