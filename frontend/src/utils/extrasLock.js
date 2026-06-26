// Lógica de cierre de los pronósticos Extras (campeón, MVP, goleador, etc.)
// Único lugar con esta fecha — Extras.jsx y el banner global (Layout.jsx) importan
// de aquí para no terminar con dos copias que se desincronicen entre sí.

// Fecha fallback: primer día conocido de octavos — se cierra ahí (no en dieciseisavos)
// porque con 32 equipos en juego predecir campeón/goleador/MVP es mucho más difícil.
// Se sobreescribe si la API ya tiene el fixture real.
export const R16_FALLBACK = new Date("2026-07-04T14:00:00");

export const getR16Date = (matches) => {
  const r16 = matches
    .filter((m) => m.league.round === "Round of 16")
    .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))[0];
  return r16 ? new Date(r16.fixture.date) : R16_FALLBACK;
};

export const isExtrasLocked = (matches) => {
  // Si hay partidos de octavos en la API: cerrar cuando el primero ya no sea NS
  const hasR16 = matches.some((m) => m.league.round === "Round of 16");
  if (hasR16) return matches.some((m) => m.league.round === "Round of 16" && m.fixture.status.short !== "NS");
  // Si todavía no están en la API: usar fecha fallback
  return new Date() >= R16_FALLBACK;
};

export const getDaysToExtrasLock = (matches) => {
  const r16Date = getR16Date(matches);
  const diff = Math.ceil((r16Date - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};
