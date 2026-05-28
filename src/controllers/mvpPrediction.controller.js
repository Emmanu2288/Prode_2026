import axios from "axios";
import MvpPrediction from "../models/MvpPrediction.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Crear predicción de MVP por partido
export const createMvpPrediction = async (req, res) => {
  try {
    const { match, mvpPlayer } = req.body;
    const userId = req.user.id;

    if (!match) {
      return res.status(400).json({ error: "Faltan datos: match es requerido." });
    }

    let externalMatchId = String(match);
    let statusBlocked = false;

    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { id: match },
        headers: { "x-apisports-key": API_KEY },
        timeout: 5000
      });

      const fixture = response.data?.response?.[0];
      if (fixture) {
        externalMatchId = String(fixture?.fixture?.id ?? fixture?.id ?? match);
        const status = fixture.status?.short;
        const allowForce = process.env.NODE_ENV !== "production" && req.query?.force === "true";
        if (!allowForce && status !== "NS") {
          statusBlocked = true;
        }
      }
    } catch (apiErr) {
      console.warn("API de fútbol no disponible al crear predicción MVP:", apiErr.message);
    }

    if (statusBlocked) {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta de MVP." });
    }

    const already = await MvpPrediction.findOne({ user: userId, match: externalMatchId });
    if (already) {
      return res.status(409).json({ error: "Ya existe una predicción de MVP para este usuario y partido." });
    }

    const prediction = await MvpPrediction.create({
      user: userId,
      match: externalMatchId,
      mvpPlayer
    });

    return res.status(201).json(prediction);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Ya existe una predicción de MVP para este usuario y partido." });
    }

    console.error("createMvpPrediction error:", err);
    return res.status(500).json({ error: "Error interno al crear la predicción." });
  }
};

// Listar MVPs de un usuario
export const getUserMvpPredictions = async (req, res) => {
  try {
    const predictions = await MvpPrediction.find({ user: req.params.userId }).populate("match");
    return res.json(predictions);
  } catch (err) {
    console.error("getUserMvpPredictions error:", err.message);
    return res.status(500).json({ error: "Error interno al obtener predicciones." });
  }
};