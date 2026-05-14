import cron from "node-cron";
import axios from "axios";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

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
        predictedScore: "0-0"
      });
      console.log(`✅ 0-0 asignado a ${userId} para partido ${matchId}`);
    }
  } catch (err) {
    // Manejo de duplicado por concurrencia
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

export const scheduleMatchStatusCheck = () => {
  // Corre cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Cron job ejecutado: revisando partidos en vivo...");

    if (!API_KEY) {
      console.warn("⚠️ FOOTBALL_API_KEY no configurada. Saltando chequeo de fixtures.");
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { live: "all" },
        headers: { "x-apisports-key": API_KEY }
      });

      const liveFixtures = response.data?.response || [];
      if (!liveFixtures.length) {
        console.log("ℹ️ No hay partidos en vivo en este momento.");
        return;
      }

      for (const fixture of liveFixtures) {
        const matchId = fixture.fixture.id;

        // Opción A: asignar a TODOS los usuarios
        const usersCursor = User.find().select("_id").lean().cursor();
        const allUserIds = [];
        for await (const u of usersCursor) allUserIds.push(u._id.toString());
        await processUsersInBatches(matchId, allUserIds);

      }
    } catch (err) {
      console.error("❌ Error en cron job:", err?.message || err);
    }
  });
};
