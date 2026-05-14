import cron from "node-cron";
import axios from "axios";
import Prediction from "../models/Prediction.js";
// ⚠️ Cuando tengamos el modelo User, lo vamos a importar acá:
// import User from "../models/User.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

export const scheduleMatchStatusCheck = () => {
  // Corre cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Cron job ejecutado: revisando partidos en vivo...");

    try {
      // Pedimos todos los partidos en vivo
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { live: "all" },
        headers: { "x-apisports-key": API_KEY }
      });

      const liveFixtures = response.data.response;

      for (const fixture of liveFixtures) {
        const matchId = fixture.fixture.id;

        // ⚠️ Placeholder: cuando tengamos usuarios, reemplazamos esto por:
        // const users = await User.find();
        const userIds = ["idUsuario1", "idUsuario2"]; // temporal

        for (const userId of userIds) {
          const existing = await Prediction.findOne({ user: userId, match: matchId });
          if (!existing) {
            await Prediction.create({
              user: userId,
              match: matchId,
              predictedScore: "0-0"
            });
            console.log(`✅ Se asignó 0-0 automático a usuario ${userId} en partido ${matchId}`);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error en cron job:", err.message);
    }
  });
};
