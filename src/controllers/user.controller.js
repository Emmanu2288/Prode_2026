import User from "../models/User.js";
import bcrypt from "bcryptjs";

/**
 * Listar todos los usuarios (solo admin)
 */
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.json(users);
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

/**
 * Actualizar usuario (propio o admin)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para actualizar este usuario" });
    }

    const updates = { ...req.body };

    // Si actualizan password, hashearla antes de guardar
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Evitar que role sea cambiado por un user normal
    if (req.user.role !== "admin") {
      delete updates.role;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.json({ message: "Usuario actualizado", user: updatedUser });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

/**
 * Eliminar usuario (solo admin)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Error al eliminar usuario" });
  }
};
