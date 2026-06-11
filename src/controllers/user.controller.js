import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Group from "../models/Group.js";
import Membership from "../models/Membership.js";
import Prediction from "../models/Prediction.js";
import Payment from "../models/Payment.js";
import PushSubscription from "../models/PushSubscription.js";
import GroupPoints from "../models/GroupPoints.js";
import Correction from "../models/Correction.js";
import Invitation from "../models/Invitation.js";

/**
 * Buscar usuarios por nombre o email (cualquier usuario autenticado)
 * Excluye al propio usuario de los resultados
 */
export const searchUsers = async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (q.trim().length < 2) {
      return res.json([]);
    }
    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
      ],
    })
      .select("_id first_name last_name email")
      .limit(20)
      .lean();
    return res.json(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Error al buscar usuarios" });
  }
};

/**
 * Leaderboard global — todos los usuarios ordenados por puntos
 */
export const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find()
      .select("first_name last_name totalPoints googleId")
      .sort({ totalPoints: -1 })
      .lean();
    return res.json(users);
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ message: "Error al obtener el leaderboard" });
  }
};

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
 * Eliminar usuario (solo admin), con borrado en cascada de todos sus datos asociados
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: "No podés eliminar tu propia cuenta" });
    }

    const ownedGroups = await Group.countDocuments({ owner: id });
    if (ownedGroups > 0) {
      return res.status(400).json({ message: "El usuario es dueño de uno o más grupos. Eliminá esos grupos antes de borrar al usuario." });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "Usuario no encontrado" });

    await Promise.all([
      Membership.deleteMany({ user: id }),
      Prediction.deleteMany({ user: id }),
      Payment.deleteMany({ user: id }),
      PushSubscription.deleteMany({ user: id }),
      GroupPoints.deleteMany({ user: id }),
      Correction.deleteMany({ userId: id }),
      Invitation.deleteMany({ $or: [{ invitedUser: id }, { inviter: id }] }),
    ]);

    return res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Error al eliminar usuario" });
  }
};
