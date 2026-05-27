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

    // Consultar estado del partido en la API para validar y obtener el matchId externo
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: { id: match },
      headers: { "x-apisports-key": API_KEY }
    });

    const fixture = response.data?.response?.[0];
    if (!fixture) {
      return res.status(404).json({ error: "Partido no encontrado en la API." });
    }

    // Extraer el id del proveedor de forma consistente
    const externalMatchId = String(fixture?.fixture?.id ?? fixture?.id ?? match);

    // Comprobación previa para evitar duplicados (por user + match)
    // Nota: el esquema original de MvpPrediction define 'match' como ObjectId.
    // Si en tu DB guardás el id externo como string en 'match', esta búsqueda funcionará.
    const already = await MvpPrediction.findOne({ user, match: externalMatchId });
    if (already) {
      return res.status(409).json({ error: "Ya existe una predicción de MVP para este usuario y partido." });
    }

    const status = fixture.status?.short;

    // Permitir bypass en desarrollo para pruebas manuales
    const allowForce = process.env.NODE_ENV !== "production" && req.query?.force === "true";
    if (!allowForce && status !== "NS") {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta de MVP." });
    }

    // Crear la predicción usando el externalMatchId en el campo 'match' (string)
    const prediction = await MvpPrediction.create({
      user,
      match: externalMatchId,
      mvpPlayer
    });

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