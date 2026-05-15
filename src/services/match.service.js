import axios from "axios";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

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