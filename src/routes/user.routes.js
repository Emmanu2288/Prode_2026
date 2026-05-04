import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// Ruta de prueba: listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

export default router;
