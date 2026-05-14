import axios from "axios";
import MvpPrediction from "../models/MvpPrediction.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Crear predicción de MVP por partido
export const createMvpPrediction = async (req, res) => {
  try {
    const { match, user, mvpPlayer } = req.body;

    if (!match || !user) {
      return res.status(400).json({ error: "Faltan datos: match y user son requeridos." });
    }

    // Comprobación previa opcional para dar feedback rápido
    const already = await MvpPrediction.findOne({ user, match });
    if (already) {
      return res.status(409).json({ error: "Ya existe una predicción de MVP para este usuario y partido." });
    }

    // Consultar estado del partido en la API
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: { id: match },
      headers: { "x-apisports-key": API_KEY }
    });

    const fixture = response.data?.response?.[0];
    if (!fixture) {
      return res.status(404).json({ error: "Partido no encontrado en la API." });
    }

    const status = fixture.status?.short;

    // Bloqueo si el partido ya empezó o terminó
    if (status !== "NS") {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta de MVP." });
    }

    // Intentamos crear la predicción
    const prediction = await MvpPrediction.create({ user, match, mvpPlayer });
    return res.status(201).json(prediction);
  } catch (err) {
    // Manejo explícito de error de índice único (duplicado)
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
