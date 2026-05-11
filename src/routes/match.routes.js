import { Router } from "express";
import { getMatchesFromAPI } from "../services/match.service.js";

const router = Router();

// Ejemplo: obtener partidos de la liga 1 (Champions League) temporada 2024
router.get("/", async (req, res) => {
  try {
    const { leagueId, season } = req.query; // se pasan como parámetros
    const matches = await getMatchesFromAPI(leagueId, season);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
