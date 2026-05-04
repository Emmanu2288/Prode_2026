import { Router } from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const router = Router();

// 📌 Listar todos los usuarios (administradores solamente)
router.get('/', verifyToken, roleMiddleware(['admin']), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

// 📌 Actualizar usuario (propio o admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para actualizar este usuario' });
    }

    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Usuario actualizado', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
});

// 📌 Eliminar usuario (solo admin)
router.delete('/:id', verifyToken, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
});

export default router;
