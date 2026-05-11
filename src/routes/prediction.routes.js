import { Router } from 'express';
import Prediction from '../models/Prediction.js';

const router = Router();

// Crear o actualizar predicción
router.post('/', async (req, res) => {
     try {
    const prediction = await Prediction.create(req.body);
    res.status(201).json(prediction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Guardar extras del Mundial (campeón, mejor jugador, etc.)
router.post("/extras", async (req, res) => {
  try {
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
    res.status(400).json({ error: err.message });
  }
});

// Listar pronósticos de un usuario
router.get("/user/:userId", async (req, res) => {
  const predictions = await Prediction.find({ user: req.params.userId }).populate("match");
  res.json(predictions);
});

export default router;