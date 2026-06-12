import GroupPoints from "../models/GroupPoints.js";
import Membership from "../models/Membership.js";

/**
 * Leaderboard por grupo: incluye a todos los miembros del grupo
 * (con 0 puntos si todavía no tienen registro en GroupPoints).
 */
export const getGroupLeaderboard = async (req, res) => {
  try {
    const { groupId } = req.params;

    const [members, groupPoints] = await Promise.all([
      Membership.find({ group: groupId }).populate("user", "first_name last_name email").lean(),
      GroupPoints.find({ group: groupId }).lean(),
    ]);

    const pointsByUser = new Map(groupPoints.map((gp) => [String(gp.user), gp.points]));

    const leaderboard = members
      .filter((m) => m.user)
      .map((m) => ({
        user: m.user,
        points: pointsByUser.get(String(m.user._id)) ?? 0,
      }))
      .sort((a, b) => b.points - a.points);

    return res.json(leaderboard);
  } catch (err) {
    console.error("getGroupLeaderboard error:", err);
    return res.status(500).json({ message: "Error al obtener leaderboard" });
  }
};