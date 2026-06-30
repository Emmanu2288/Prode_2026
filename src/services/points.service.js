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

// A partir de Francia-Suecia (primer PEN tras el cambio de reglas) el resultado
// exacto en penales vale más que solo acertar quién avanza, igual que ya pasa
// en los partidos sin penales (exacto 3 > ganador 1). Antes de este corte
// (ej. Países Bajos-Marruecos) ambos criterios valían lo mismo — se deja así
// para no recalcular puntos ya otorgados.
const PEN_V2_CUTOFF = new Date("2026-06-30T21:00:00Z");

export const calculatePointsFinal = (prediction, finalGoals, finalMvp, options = {}) => {
  try {
    const { statusShort = null, winnerTeam = null, matchDate = null } = options;
    const [ph, pa] = String(prediction.predictedScore || "0-0").split("-").map(Number);
    const fh = Number(finalGoals.home ?? finalGoals.homeTeam ?? finalGoals.home);
    const fa = Number(finalGoals.away ?? finalGoals.awayTeam ?? finalGoals.away);

    if ([ph, pa, fh, fa].some((n) => Number.isNaN(n))) return 0;

    let points = 0;

    if (statusShort === "PEN") {
      // PEN: score is tied in regular+ET time; winner decided by penalty shootout
      const correctScore = ph === fh && pa === fa;
      let correctWinner = false;
      if (prediction.advancingTeam && winnerTeam) {
        const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        const p = norm(prediction.advancingTeam);
        const w = norm(winnerTeam);
        correctWinner = w.includes(p) || p.includes(w);
      }
      const isV2 = matchDate ? new Date(matchDate) >= PEN_V2_CUTOFF : true;
      if (isV2) {
        if (correctScore && correctWinner) points = 3;
        else if (correctScore) points = 2;
        else if (correctWinner) points = 1;
      } else {
        if (correctScore && correctWinner) points = 3;
        else if (correctScore || correctWinner) points = 1;
      }
    } else {
      // FT / AET: score determines winner
      if (ph === fh && pa === fa) {
        points += 3;
      } else {
        const predDiff = Math.sign(ph - pa);
        const finalDiff = Math.sign(fh - fa);
        if (predDiff === finalDiff) points += 1;
      }
    }

    // MVP — comparación tolerante (apellido, parcial, sin tildes, e inicial vs nombre completo)
    const predMvp = prediction.mvpPlayer ?? prediction.mvp ?? null;
    if (predMvp && finalMvp) {
      const normalize = (s) =>
        String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\./g, "").trim();
      const p = normalize(predMvp);
      const a = normalize(finalMvp);

      let mvpMatch = a.includes(p) || p.includes(a);

      // Apellido igual + inicial de nombre compatible (ej: "I. Koné" vs "Ismael Koné")
      if (!mvpMatch) {
        const pWords = p.split(/\s+/);
        const aWords = a.split(/\s+/);
        const pLast = pWords[pWords.length - 1];
        const aLast = aWords[aWords.length - 1];
        const pFirst = pWords[0];
        const aFirst = aWords[0];
        const firstNameMatch =
          pFirst === aFirst ||
          (pFirst.length === 1 && aFirst[0] === pFirst) ||
          (aFirst.length === 1 && pFirst[0] === aFirst);
        mvpMatch = pLast === aLast && firstNameMatch;
      }

      if (mvpMatch) points += 2;
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
    // Delta respecto del puntaje previamente aplicado (0 la primera vez que se procesa).
    // Necesario para que una recalculación (ej: corrección manual de MVP) no vuelva
    // a sumar el total completo sobre lo ya acumulado.
    const oldPoints = predictionDoc.points ?? 0;
    const delta = points - oldPoints;

    // Actualizar prediction
    await predictionDoc.constructor.findByIdAndUpdate(predictionDoc._id, { $set: { points } });

    if (delta !== 0) {
      // Actualizar GroupPoints para cada membership del usuario
      const memberships = await Membership.find({ user: predictionDoc.user }).lean();
      for (const mem of memberships) {
        await GroupPoints.findOneAndUpdate(
          { group: mem.group, user: predictionDoc.user },
          { $inc: { points: delta }, $set: { lastUpdated: new Date() } },
          { upsert: true }
        );
      }

      // Actualizar total global en User
      await User.findByIdAndUpdate(predictionDoc.user, { $inc: { totalPoints: delta } });
    }
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