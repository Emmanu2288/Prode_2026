import ProcessedFixture from "../models/ProcessedFixture.js";
import Prediction from "../models/Prediction.js";
import { calculatePointsFinal, applyFinalPointsToPrediction, applyTournamentAwardPoints } from "./points.service.js";

/**
 * processWebhookEvent
 * - payload: objeto tal cual lo envía el proveedor de webhooks
 * - Maneja eventos en vivo (goal, card) y cambio de estado a FT
 * - Actualiza livePoints en Prediction para UI en tiempo real (no persistir en GroupPoints hasta FT)
 * - Al FT calcula puntos definitivos y actualiza Prediction.points, GroupPoints y User.totalPoints
 */
export const processWebhookEvent = async (payload) => {
  try {
    const event = payload.event ?? null;
    const fixture = payload.fixture ?? payload.match ?? null;
    if (!fixture) return;

    const matchId = String(fixture.id ?? fixture.fixture?.id ?? fixture.matchId);
    const eventId = event?.id ? String(event.id) : null;

    // Evitar reprocesos por eventId
    if (eventId) {
      const alreadyEvent = await ProcessedFixture.findOne({ matchId, eventId, type: "live_event" });
      if (alreadyEvent) return;
    }

    // Manejo de eventos en vivo (gol, tarjeta, etc.)
    if (event && (event.type === "goal" || event.type === "card")) {
      // Actualizar livePoints para predicciones del partido (solo para UI)
      const predictions = await Prediction.find({ match: matchId });
      for (const p of predictions) {
            await Prediction.findByIdAndUpdate(p._id, { $set: { liveUpdatedAt: new Date() } });
      }

      // Emitir evento a clientes via Socket.IO
      if (globalThis.io) {
        globalThis.io.to(`match_${matchId}`).emit("match_event", { matchId, event, fixture });
      }

      if (eventId) {
        await ProcessedFixture.create({ matchId, eventId, type: "live_event" });
      }
      return;
    }

    // Manejo de partido finalizado (FT)
    const statusShort = fixture.status?.short ?? fixture.status;
    if (statusShort === "FT" || String(statusShort).toLowerCase().includes("full") || String(statusShort).toLowerCase().includes("finished")) {
      const alreadyScored = await ProcessedFixture.findOne({ matchId, type: "scored" });
      if (alreadyScored) return;

      // Obtener resultado final
      const finalGoals = fixture.goals ?? fixture.score ?? { home: 0, away: 0 };
      // Obtener finalMvp si viene en payload (campo puede variar según proveedor)
      const finalMvp = fixture.mvp ?? payload.mvp ?? null;

      // Buscar todas las predicciones para este match
      const preds = await Prediction.find({ match: matchId });
      for (const pred of preds) {
        const points = calculatePointsFinal(pred, finalGoals, finalMvp);
        await applyFinalPointsToPrediction(pred, points);
      }

      // Emitir evento de partido finalizado
      if (globalThis.io) {
        globalThis.io.to(`match_${matchId}`).emit("match_finished", { matchId, finalGoals });
      }

      await ProcessedFixture.create({ matchId, type: "scored" });
      return;
    }

    // Otros eventos: emitir para UI y marcar procesado si tiene id
    if (globalThis.io) {
      globalThis.io.to(`match_${matchId}`).emit("match_event", { matchId, event, fixture });
    }
    if (eventId) {
      await ProcessedFixture.create({ matchId, eventId, type: "live_event" });
    }
  } catch (err) {
    console.error("processWebhookEvent error:", err);
    throw err;
  }
};

/**
 * processTournamentAward
 * - Llamar cuando se confirme un award del torneo (ej: winner, best_goalkeeper, best_player, top_scorer)
 * - awardType: 'winner'|'best_goalkeeper'|'best_player'|'top_scorer'
 * - userId: id del usuario que acertó el award
 */
export const processTournamentAward = async (awardType, userId) => {
  try {
    // 5 puntos por acierto de award
    await applyTournamentAwardPoints(awardType, userId, 5);

    // Emitir evento global para actualizar leaderboards en UI
    if (globalThis.io) {
      globalThis.io.emit("tournament_award", { awardType, userId, points: 5 });
    }
  } catch (err) {
    console.error("processTournamentAward error:", err);
    throw err;
  }
};