// src/services/points.service.js
import GroupPoints from "../models/GroupPoints.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";

/**
 * calculatePointsFinal
 * Reglas:
 * - Exact score: 3 puntos
 * - Correct winner: 1 punto
 * - MVP acertado: 2 puntos (se suma además de exact/winner)
 *
 * prediction.predictedScore expected "x-y"
 * finalGoals expected { home: number, away: number }
 * prediction.mvp optional: player id/string
 * finalMvp optional: player id/string
 */
export const calculatePointsFinal = (prediction, finalGoals, finalMvp) => {
  try {
    const [ph, pa] = String(prediction.predictedScore || "0-0").split("-").map(Number);
    const fh = Number(finalGoals.home ?? finalGoals.homeTeam ?? finalGoals.home);
    const fa = Number(finalGoals.away ?? finalGoals.awayTeam ?? finalGoals.away);

    if ([ph, pa, fh, fa].some((n) => Number.isNaN(n))) return 0;

    let points = 0;

    // Exact score
    if (ph === fh && pa === fa) {
      points += 3;
    } else {
      // Correct winner (or draw)
      const predDiff = Math.sign(ph - pa);
      const finalDiff = Math.sign(fh - fa);
      if (predDiff === finalDiff) points += 1;
    }

    // MVP
    if (prediction.mvp && finalMvp && String(prediction.mvp) === String(finalMvp)) {
      points += 2;
    }

    return points;
  } catch (err) {
    console.error("calculatePointsFinal error:", err);
    return 0;
  }
};

/**
 * applyFinalPointsToPrediction
 * - Actualiza Prediction.points
 * - Actualiza GroupPoints (upsert) para cada grupo donde el usuario sea miembro
 * - Incrementa User.totalPoints
 */
export const applyFinalPointsToPrediction = async (predictionDoc, points) => {
  try {
    // Actualizar prediction
    await predictionDoc.constructor.findByIdAndUpdate(predictionDoc._id, { $set: { points } });

    // Actualizar GroupPoints para cada membership del usuario
    const memberships = await Membership.find({ user: predictionDoc.user }).lean();
    for (const mem of memberships) {
      await GroupPoints.findOneAndUpdate(
        { group: mem.group, user: predictionDoc.user },
        { $inc: { points }, $set: { lastUpdated: new Date() } },
        { upsert: true }
      );
    }

    // Actualizar total global en User
    await User.findByIdAndUpdate(predictionDoc.user, { $inc: { totalPoints: points } });
  } catch (err) {
    console.error("applyFinalPointsToPrediction error:", err);
    throw err;
  }
};

/**
 * applyTournamentAwardPoints
 * - awardType: 'winner', 'best_goalkeeper', 'best_player', 'top_scorer'
 * - awardPoints: por defecto 5
 * - userId: id del usuario que acertó el award
 */
export const applyTournamentAwardPoints = async (awardType, userId, awardPoints = 5) => {
  try {
    // Actualizar GroupPoints para cada membership del usuario
    const memberships = await Membership.find({ user: userId }).lean();
    for (const mem of memberships) {
      await GroupPoints.findOneAndUpdate(
        { group: mem.group, user: userId },
        { $inc: { points: awardPoints }, $set: { lastUpdated: new Date() } },
        { upsert: true }
      );
    }

    // Actualizar total global en User
    await User.findByIdAndUpdate(userId, { $inc: { totalPoints: awardPoints } });
  } catch (err) {
    console.error("applyTournamentAwardPoints error:", err);
    throw err;
  }
};