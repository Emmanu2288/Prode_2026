import cron from "node-cron";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import ProcessedFixture from "../models/ProcessedFixture.js";
import { getWorldCup2026Matches } from "./match.service.js";
import { calculatePointsFinal, applyFinalPointsToPrediction } from "./points.service.js";

/**
 * Asigna predicción 0-0 si no existe para user+match
 */
const assignDefaultPrediction = async (matchId, userId) => {
  try {
    const existing = await Prediction.findOne({ user: userId, match: matchId });
    if (!existing) {
      await Prediction.create({
        user: userId,
        match: matchId,
        predictedScore: "0-0",
        points: 0,
        livePoints: 0
      });
      console.log(`✅ 0-0 asignado a ${userId} para partido ${matchId}`);
    }
  } catch (err) {
    if (err && err.code === 11000) return;
    console.error("assignDefaultPrediction error:", err);
  }
};

/**
 * Procesa una lista de usuarios en batches
 */
const processUsersInBatches = async (matchId, userIds, batchSize = 100) => {
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.all(batch.map((u) => assignDefaultPrediction(matchId, u)));
  }
};

/**
 * Job A: asignar predicciones por defecto (status NS)
 * Frecuencia: cada 30 minutos (suficiente para mantener predicciones antes del inicio)
 */
export const scheduleAssignDefaults = () => {
  cron.schedule("*/30 * * * *", async () => {
    console.log("⏰ Cron assign defaults: buscando partidos NS...");

    try {
      const from = new Date().toISOString().slice(0, 10);
      const toDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const to = toDate.toISOString().slice(0, 10);

      const fixtures = await getWorldCup2026Matches({ params: { status: "NS", from, to } });
      const list = Array.isArray(fixtures) ? fixtures : [];

      for (const fixture of list) {
        const matchId = String(fixture.fixture?.id ?? fixture.id);
        const already = await ProcessedFixture.findOne({ matchId, type: "assigned_default" });
        if (already) continue;

        const usersCursor = User.find().select("_id").lean().cursor();
        const allUserIds = [];
        for await (const u of usersCursor) allUserIds.push(u._id.toString());
        await processUsersInBatches(matchId, allUserIds);

        await ProcessedFixture.create({ matchId, type: "assigned_default" });
        console.log(`🟢 Assigned defaults for match ${matchId}`);
      }
    } catch (err) {
      console.error("assign defaults cron error:", err);
    }
  });
};

/**
 * Job B: procesar partidos finalizados (status FT)
 * Frecuencia: cada 1 minuto para máxima reactividad post-FT 
 */
export const scheduleFinalizeMatches = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("⏰ Cron finalize matches: buscando partidos FT...");

    try {
      const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);

      const fixtures = await getWorldCup2026Matches({ params: { status: "FT", from, to } });
      const list = Array.isArray(fixtures) ? fixtures : [];

      for (const fixture of list) {
        const matchId = String(fixture.fixture?.id ?? fixture.id);
        const already = await ProcessedFixture.findOne({ matchId, type: "scored" });
        if (already) continue;

        const finalGoals = fixture.goals ?? fixture.score ?? { home: 0, away: 0 };
        const finalMvp = fixture.mvp ?? null;

        const preds = await Prediction.find({ match: matchId });
        for (const pred of preds) {
          const points = calculatePointsFinal(pred, finalGoals, finalMvp);
          await applyFinalPointsToPrediction(pred, points);
        }

        if (globalThis.io) {
          globalThis.io.to(`match_${matchId}`).emit("match_finished", { matchId, finalGoals });
        }

        await ProcessedFixture.create({ matchId, type: "scored" });
        console.log(`🏁 Finalized and scored match ${matchId}`);
      }
    } catch (err) {
      console.error("finalize matches cron error:", err);
    }
  });
};

/**
 * scheduleMatchStatusCheck
 * Inicia los jobs de fallback. Con webhooks activos, la mayor parte del trabajo en vivo vendrá por el webhook.
 */
export const scheduleMatchStatusCheck = () => {
  scheduleAssignDefaults();
  scheduleFinalizeMatches();
};