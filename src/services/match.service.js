import axios from "axios";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Obtener partidos
export const getMatchesFromAPI = async (leagueId, season) => {
  try {
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: { league: leagueId, season },
      headers: { "x-apisports-key": API_KEY }
    });
    return response.data.response;
  } catch (err) {
    throw new Error("Error al consultar la API de fútbol: " + err.message);
  }
};