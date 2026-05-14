import axios from "axios";
import Prediction from "../models/Prediction.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Crear predicción partido a partido (resultado + MVP)
// Crear predicción partido a partido (resultado + MVP)
export const createPrediction = async (req, res) => {
  try {
    const { match, user, predictedScore, mvpPlayer } = req.body;

    if (!match || !user) {
      return res.status(400).json({ error: "Faltan datos: match y user son requeridos." });
    }

    // Comprobación previa opcional para dar feedback rápido
    const already = await Prediction.findOne({ user, match });
    if (already) {
      return res.status(409).json({ error: "Ya existe una predicción para este usuario y partido." });
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
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta." });
    }

    // Intentamos crear la predicción
    const prediction = await Prediction.create({ user, match, predictedScore, mvpPlayer });
    return res.status(201).json(prediction);
  } catch (err) {
    // Manejo explícito de error de índice único (duplicado)
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Ya existe una predicción para este usuario y partido." });
    }

    console.error("createPrediction error:", err);
    return res.status(500).json({ error: "Error interno al crear la predicción." });
  }
};

// Asignar predicción automática 0-0 si el usuario no apostó antes del inicio
export const assignDefaultPrediction = async (matchId, userId) => {
  try {
    const existing = await Prediction.findOne({ user: userId, match: matchId });
    if (!existing) {
      await Prediction.create({
        user: userId,
        match: matchId,
        predictedScore: "0-0"
      });
    }
  } catch (err) {
    // Manejo de duplicados por si hay concurrencia
    if (err && err.code === 11000) {
      // ya existe, no hacemos nada
      return;
    }
    console.error("Error asignando predicción por defecto:", err);
  }
};

// Guardar extras del Mundial (campeón, mejor jugador, etc.)
export const updateExtras = async (req, res) => {
  try {
    const now = new Date();
    const knockoutStart = new Date("2026-06-27T00:00:00"); // fecha del primer partido de octavos

    if (now >= knockoutStart) {
      return res.status(400).json({ error: "Ya comenzaron los octavos de final, no se pueden modificar las apuestas globales." });
    }

    const prediction = await Prediction.findOneAndUpdate(
      { user: req.body.user },
      {
        worldChampion: req.body.worldChampion,
        bestPlayer: req.body.bestPlayer,
        topScorer: req.body.topScorer,
        bestGoalkeeper: req.body.bestGoalkeeper,
        revelationTeam: req.body.revelationTeam
      },
      { new: true, upsert: true }
    );

    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar pronósticos de un usuario
export const getUserPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.params.userId }).populate("match");
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
