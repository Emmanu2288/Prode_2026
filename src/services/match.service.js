import axios from "axios";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;
const WORLD_CUP_LEAGUE_ID = process.env.WORLD_CUP_LEAGUE_ID ? Number(process.env.WORLD_CUP_LEAGUE_ID) : 1;
const WORLD_CUP_SEASON = process.env.API_SEASON || 2026;

export const getWorldCup2026Matches = async (opts = {}) => {
  if (!API_KEY) throw new Error("FOOTBALL_API_KEY no configurada");
  const { leagueId = WORLD_CUP_LEAGUE_ID, season = WORLD_CUP_SEASON, params = {} } = opts;

  try {
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: { league: leagueId, season, ...params },
      headers: { "x-apisports-key": API_KEY }
    });
    if (!response.data || !response.data.response) {
      throw new Error("Respuesta inesperada de la API de fútbol");
    }
    return response.data.response;
  } catch (err) {
    console.error("getWorldCup2026Matches error:", err.message);
    throw new Error("Error al consultar la API de fútbol: " + err.message);
  }
};

/**
 * Devuelve la tabla de posiciones por grupo (fase de grupos).
 * Cada elemento de `standings` es un array con los equipos de un grupo.
 */
export const getWorldCupStandings = async (opts = {}) => {
  if (!API_KEY) throw new Error("FOOTBALL_API_KEY no configurada");
  const { leagueId = WORLD_CUP_LEAGUE_ID, season = WORLD_CUP_SEASON } = opts;

  try {
    const response = await axios.get(`${API_URL}/standings`, {
      params: { league: leagueId, season },
      headers: { "x-apisports-key": API_KEY }
    });
    return response.data?.response?.[0]?.league?.standings || [];
  } catch (err) {
    console.error("getWorldCupStandings error:", err.message);
    throw new Error("Error al consultar la tabla de posiciones: " + err.message);
  }
};

/**
 * Devuelve el nombre del jugador con mayor rating de un fixture finalizado (figura del partido).
 * null si todavía no hay calificaciones disponibles.
 */
export const getFixtureMvp = async (matchId) => {
  if (!API_KEY) return null;
  try {
    const res = await axios.get(`${API_URL}/fixtures`, {
      params: { id: matchId },
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });
    const fixture = res.data?.response?.[0];
    if (!fixture?.players) return null;

    let topPlayer = null;
    let topRating = 0;
    for (const team of fixture.players) {
      for (const entry of team.players) {
        const rating = parseFloat(entry?.statistics?.[0]?.games?.rating ?? 0);
        if (rating > topRating) {
          topRating = rating;
          topPlayer = entry?.player?.name ?? null;
        }
      }
    }
    return topPlayer;
  } catch (err) {
    console.warn("getFixtureMvp error:", err.message);
    return null;
  }
};