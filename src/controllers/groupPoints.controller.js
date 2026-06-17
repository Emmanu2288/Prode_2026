import GroupPoints from "../models/GroupPoints.js";
import Membership from "../models/Membership.js";
import Prediction from "../models/Prediction.js";
import ProcessedFixture from "../models/ProcessedFixture.js";

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

/**
 * GET /api/groups/:groupId/evolution
 * Serie temporal de puntos acumulados por usuario para el gráfico de evolución.
 * Usa 3 queries a MongoDB (sin llamadas a la API externa).
 */
export const getPointsEvolution = async (req, res) => {
  try {
    const { groupId } = req.params;

    const members = await Membership.find({ group: groupId })
      .populate("user", "first_name last_name")
      .lean();

    const userIds = members.filter((m) => m.user).map((m) => String(m.user._id));
    if (!userIds.length) return res.json({ matches: [], series: [] });

    const pfs = await ProcessedFixture.find({ type: "scored" })
      .sort({ processedAt: 1 })
      .lean();

    if (!pfs.length) return res.json({ matches: [], series: [] });

    const matchIds = pfs.map((pf) => pf.matchId);

    const allPreds = await Prediction.find({
      user: { $in: userIds },
      matchId: { $in: matchIds },
    }).lean();

    const predsByUser = {};
    for (const pred of allPreds) {
      const uid = String(pred.user);
      if (!predsByUser[uid]) predsByUser[uid] = {};
      predsByUser[uid][pred.matchId] = pred.points ?? 0;
    }

    const series = members
      .filter((m) => m.user)
      .map((m) => {
        const uid = String(m.user._id);
        const name = [m.user.first_name, m.user.last_name].filter(Boolean).join(" ") || "Usuario";
        let cum = 0;
        const cumulative = matchIds.map((matchId) => {
          cum += predsByUser[uid]?.[matchId] ?? 0;
          return cum;
        });
        return { userId: uid, name, cumulative };
      });

    const matches = pfs.map((pf, i) => ({
      matchId: pf.matchId,
      label: `P${i + 1}`,
      date: pf.processedAt,
    }));

    return res.json({ matches, series });
  } catch (err) {
    console.error("getPointsEvolution error:", err);
    return res.status(500).json({ error: err.message });
  }
};