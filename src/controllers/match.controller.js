import { getMatchesFromAPI } from "../services/match.service.js";

// Controlador para obtener partidos desde la API externa
export const getMatches = async (req, res) => {
  try {
    const { leagueId, season } = req.query;
    const matches = await getMatchesFromAPI(leagueId, season);
    return res.json(matches);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
