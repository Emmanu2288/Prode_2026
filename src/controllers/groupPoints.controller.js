import GroupPoints from "../models/GroupPoints.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";

/**
 * Leaderboard por grupo (usa GroupPoints si existe, si no, fallback a agregación)
 */
export const getGroupLeaderboard = async (req, res) => {
  try {
    const { groupId } = req.params;
    // Usamos GroupPoints para rendimiento
    const leaderboard = await GroupPoints.find({ group: groupId })
      .sort({ points: -1 })
      .limit(100)
      .populate("user", "first_name last_name email");

    // Si no hay datos en GroupPoints, podés implementar fallback con agregación sobre Prediction
    return res.json(leaderboard);
  } catch (err) {
    console.error("getGroupLeaderboard error:", err);
    return res.status(500).json({ message: "Error al obtener leaderboard" });
  }
};