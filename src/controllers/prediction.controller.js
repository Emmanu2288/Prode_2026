import axios from "axios";
import Prediction from "../models/Prediction.js";
import Membership from "../models/Membership.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Crear predicción partido a partido (resultado + MVP)
export const createPrediction = async (req, res) => {
  try {
    const { match, predictedScore, mvpPlayer, kickoff, advancingTeam } = req.body;
    const userId = req.user.id;

    const blocked = await Membership.exists({ user: userId, enabled: false });
    if (blocked) {
      return res.status(403).json({ error: "🔒 Todavía no podés pronosticar: falta confirmar tu pago. Transferí a emmanuel.lv.mp (alias Mercado Pago) y avisale a tu admin para que te habilite." });
    }

    if (!match) {
      return res.status(400).json({ error: "Faltan datos: match es requerido." });
    }

    // Chequeo primario por horario de kickoff: no depende de la API externa,
    // así seguimos bloqueando aunque la API de fútbol falle o esté rate-limited
    if (kickoff && new Date() >= new Date(kickoff)) {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta." });
    }

    // Consultar estado del partido en la API para validar y obtener el matchId externo
    let externalMatchId = String(match);
    let statusBlocked = false;

    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { id: match },
        headers: { "x-apisports-key": API_KEY },
        timeout: 5000
      });

      const fixtureData = response.data?.response?.[0];
      if (fixtureData) {
        externalMatchId = String(fixtureData?.fixture?.id ?? match);
        const status = fixtureData?.fixture?.status?.short;
        const allowForce = process.env.NODE_ENV !== "production" && req.query?.force === "true";
        if (!allowForce && status && status !== "NS") {
          statusBlocked = true;
        }
      }
    } catch (apiErr) {
      // Si la API está caída o rate-limited, continuamos sin validación externa
      console.warn("API de fútbol no disponible al crear predicción:", apiErr.message);
    }

    if (statusBlocked) {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar la apuesta." });
    }

    // Buscar predicción existente
    const existing = await Prediction.findOne({ user: userId, matchId: externalMatchId });

    if (existing) {
      // Ya existe → actualizar
      existing.predictedScore = predictedScore;
      if (mvpPlayer !== undefined) existing.mvpPlayer = mvpPlayer;
      if (advancingTeam !== undefined) existing.advancingTeam = advancingTeam ?? null;
      await existing.save();
      return res.status(200).json(existing);
    }

    // No existe → crear nueva
    const prediction = await Prediction.create({
      user: userId,
      matchId: externalMatchId,
      predictedScore,
      mvpPlayer,
      advancingTeam: advancingTeam ?? null,
    });

    return res.status(201).json(prediction);
  } catch (err) {
    console.error("createPrediction error:", err);
    return res.status(500).json({ error: "Error interno al crear la predicción." });
  }
};

// Actualizar predicción existente (solo si el partido no empezó)
export const updatePrediction = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { predictedScore, mvpPlayer, kickoff, advancingTeam } = req.body;
    const userId = req.user.id;

    const blocked = await Membership.exists({ user: userId, enabled: false });
    if (blocked) {
      return res.status(403).json({ error: "🔒 Todavía no podés pronosticar: falta confirmar tu pago. Transferí a emmanuel.lv.mp (alias Mercado Pago) y avisale a tu admin para que te habilite." });
    }

    // Chequeo primario por horario de kickoff: no depende de la API externa
    if (kickoff && new Date() >= new Date(kickoff)) {
      return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar el pronóstico." });
    }

    // Verificar estado del partido
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { id: matchId },
        headers: { "x-apisports-key": API_KEY },
        timeout: 5000
      });
      const fixtureData = response.data?.response?.[0];
      if (fixtureData) {
        const status = fixtureData?.fixture?.status?.short;
        if (status && status !== "NS") {
          return res.status(400).json({ error: "El partido ya comenzó, no se puede modificar el pronóstico." });
        }
      }
    } catch (apiErr) {
      console.warn("API no disponible al actualizar predicción:", apiErr.message);
    }

    const updateFields = { predictedScore };
    if (mvpPlayer !== undefined) updateFields.mvpPlayer = mvpPlayer;
    if (advancingTeam !== undefined) updateFields.advancingTeam = advancingTeam ?? null;

    const prediction = await Prediction.findOneAndUpdate(
      { user: userId, matchId: String(matchId) },
      updateFields,
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({ error: "Pronóstico no encontrado." });
    }

    return res.json(prediction);
  } catch (err) {
    console.error("updatePrediction error:", err);
    return res.status(500).json({ error: "Error al actualizar el pronóstico." });
  }
};

// Asignar predicción automática 0-0 si el usuario no apostó antes del inicio
export const assignDefaultPrediction = async (matchId, userId) => {
  try {
    // Buscar por matchId (string)
    const existing = await Prediction.findOne({ user: userId, matchId: matchId });
    if (!existing) {
      await Prediction.create({
        user: userId,
        matchId: matchId,
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

// Obtener extras del usuario autenticado
export const getExtras = async (req, res) => {
  try {
    const extras = await Prediction.findOne({
      user: req.user.id,
      matchId: { $exists: false },
      predictedScore: { $exists: false }
    }).select("worldChampion bestPlayer topScorer bestGoalkeeper fairPlayTeam bestYoungPlayer revelationTeam");
    res.json(extras || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Guardar/actualizar extras del Mundial (campeón, mejor jugador, etc.)
export const updateExtras = async (req, res) => {
  try {
    const now = new Date();
    const knockoutStart = new Date("2026-07-04T00:00:00");

    if (now >= knockoutStart) {
      return res.status(400).json({ error: "Ya comenzaron los octavos de final, no se pueden modificar las apuestas globales." });
    }

    const { worldChampion, bestPlayer, topScorer, bestGoalkeeper, fairPlayTeam, bestYoungPlayer } = req.body;

    // Documento exclusivo para extras (sin matchId ni predictedScore)
    const extras = await Prediction.findOneAndUpdate(
      {
        user: req.user.id,
        matchId: { $exists: false },
        predictedScore: { $exists: false }
      },
      { worldChampion, bestPlayer, topScorer, bestGoalkeeper, fairPlayTeam, bestYoungPlayer },
      { new: true, upsert: true }
    );

    res.json(extras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar pronósticos del usuario autenticado
export const getMyPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar pronósticos de un usuario por ID
export const getUserPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};