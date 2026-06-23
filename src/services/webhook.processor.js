import mongoose from "mongoose";
import ProcessedFixture from "../models/ProcessedFixture.js";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import { calculatePointsFinal, applyFinalPointsToPrediction, applyTournamentAwardPoints } from "./points.service.js";
import { getFixtureMvp } from "./match.service.js";

/**
 * Compara el nombre predicho con el nombre real (tolerante a apellidos, parciales).
 * Ej: "Messi" === "Lionel Messi" → true
 */
export const mvpNamesMatch = (predicted, actual) => {
  if (!predicted || !actual) return false;
  const normalize = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const p = normalize(predicted);
  const a = normalize(actual);
  return a.includes(p) || p.includes(a);
};

/**
 * processWebhookEvent
 * - payload: objeto tal cual lo envía el proveedor de webhooks
 * - Maneja eventos en vivo (goal, card) y cambio de estado a FT
 * - Actualiza livePoints en Prediction para UI en tiempo real (no persistir en GroupPoints hasta FT)
 * - Al FT calcula puntos definitivos y actualiza Prediction.points, GroupPoints y User.totalPoints
 */
export const processWebhookEvent = async (payload) => {
  try {
    // Aceptar fixture en payload.fixture, payload.match o en el propio payload
    const event = payload?.event ?? null;
    const fixture = payload?.fixture ?? payload?.match ?? payload ?? null;
    if (!fixture) {
      console.log("processWebhookEvent: no fixture found in payload");
      return;
    }

    const matchId = String(
      fixture?.id ??
      fixture?.fixture?.id ??
      fixture?.matchId ??
      payload?.matchId ??
      payload?.fixture?.id ??
      payload?.id ??
      ""
    );

    const eventId = event?.id ? String(event.id) : null;

    // Evitar reprocesos por eventId
    if (eventId) {
      const alreadyEvent = await ProcessedFixture.findOne({ matchId, eventId, type: "live_event" });
      if (alreadyEvent) {
        console.log("processWebhookEvent: event already processed", { matchId, eventId });
        return;
      }
    }

    // Manejo de eventos en vivo (gol, tarjeta, etc.)
    if (event && (event.type === "goal" || event.type === "card")) {
      console.log("processWebhookEvent: live event detected", { matchId, eventType: event.type, eventId });

      // Actualizar livePoints para predicciones del partido (solo para UI)
      const predictions = await Prediction.find({ match: matchId }).lean().exec();
      for (const p of predictions) {
        await Prediction.findByIdAndUpdate(p._id, { $set: { liveUpdatedAt: new Date() } });
      }

      // Emitir evento a clientes via Socket.IO
      if (globalThis.io) {
        globalThis.io.to(`match_${matchId}`).emit("match_event", { matchId, event, fixture });
      }

      if (eventId) {
        console.log("processWebhookEvent (live_event) START for matchId:", matchId, "eventId:", eventId);
        try {
          const res = await ProcessedFixture.create({ matchId, eventId, type: "live_event" });
          console.log("ProcessedFixture (live_event) INSERTED id:", res._id);
        } catch (e) {
          console.error("ProcessedFixture (live_event) INSERT ERROR:", e);
        }
      }
      return;
    }

    // Determinar status buscando en varios lugares (fixture.status, payload.status, status.short, etc.)
    const statusShort =
      fixture?.status?.short ??
      fixture?.status ??
      payload?.status?.short ??
      payload?.status ??
      null;

    // Manejo de partido finalizado (FT, AET, PEN — incluyendo tiempo extra y penales de knockout)
    const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);
    if (FINAL_STATUSES.has(statusShort) || String(statusShort).toLowerCase().includes("full") || String(statusShort).toLowerCase().includes("finished")) {
      console.log("processWebhookEvent: final match detected for matchId:", matchId, "status:", statusShort);

      const alreadyScored = await ProcessedFixture.findOne({ matchId, type: "scored" });
      if (alreadyScored) {
        console.log("processWebhookEvent: match already scored, skipping", matchId);
        return;
      }

      // Obtener resultado final
      const finalGoals = fixture?.goals ?? fixture?.score ?? payload?.goals ?? { home: 0, away: 0 };

      // Obtener MVP: primero del payload, sino buscar el jugador con mayor rating en la API
      const payloadMvp = fixture?.mvp ?? payload?.mvp ?? null;
      const finalMvp = payloadMvp ?? await getFixtureMvp(matchId);
      if (finalMvp) console.log(`processWebhookEvent: MVP del partido ${matchId}: ${finalMvp}`);

      // Asignar predicción 0-0 a cada usuario que no pronosticó este partido
      const allUserIds = await User.distinct("_id");
      const predUserIds = await Prediction.distinct("user", { matchId });
      const predUserSet = new Set(predUserIds.map(String));
      for (const uid of allUserIds) {
        if (!predUserSet.has(String(uid))) {
          try {
            await Prediction.create({ user: uid, matchId, predictedScore: "0-0" });
          } catch (e) {
            if (e.code !== 11000) console.warn(`assignDefault ${matchId}/${uid}:`, e.message);
          }
        }
      }

      // Construir query segura para buscar predicciones sin provocar CastError
      let preds = [];
      const matchQuery = { $or: [] };

      // Si el campo 'match' en Prediction es ObjectId, solo buscar por match como ObjectId si es válido
      if (mongoose.Types.ObjectId.isValid(matchId)) {
        matchQuery.$or.push({ match: mongoose.Types.ObjectId(matchId) });
      }

      // Buscar por campo alternativo 'matchId' (string) que recomendamos mantener en el modelo
      matchQuery.$or.push({ matchId: matchId });

      // Evitar query vacía
      if (matchQuery.$or.length === 0) {
        console.log("No valid match query could be built for matchId:", matchId);
        preds = [];
      } else {
        try {
          preds = await Prediction.find(matchQuery).exec();
        } catch (e) {
          console.error("Error fetching predictions for match, trying fallback queries:", e);
          // Fallback: intentar buscar por matchId directamente
          try {
            preds = await Prediction.find({ matchId: matchId }).exec();
          } catch (e2) {
            console.error("Fallback prediction fetch failed:", e2);
            preds = [];
          }
        }
      }

      // Para PEN: extraer equipo ganador del fixture
      const winnerTeam = statusShort === "PEN"
        ? (fixture?.teams?.home?.winner ? fixture.teams.home.name : fixture?.teams?.away?.name ?? null)
        : null;

      for (const pred of preds) {
        try {
          const points = calculatePointsFinal(pred, finalGoals, finalMvp, { statusShort, winnerTeam });
          await applyFinalPointsToPrediction(pred, points);
        } catch (e) {
          console.error("Error applying final points to prediction:", e, { predId: pred._id });
        }
      }

      // Emitir evento de partido finalizado
      if (globalThis.io) {
        globalThis.io.to(`match_${matchId}`).emit("match_finished", { matchId, finalGoals });
      }

      console.log("processWebhookEvent (scored) START for matchId:", matchId);
      try {
        const res = await ProcessedFixture.create({ matchId, type: "scored", mvp: finalMvp });
        console.log("ProcessedFixture (scored) INSERTED id:", res._id);
      } catch (e) {
        console.error("ProcessedFixture (scored) INSERT ERROR:", e);
      }
      return;
    }

    // Otros eventos: emitir para UI y marcar procesado si tiene id
    if (globalThis.io) {
      globalThis.io.to(`match_${matchId}`).emit("match_event", { matchId, event, fixture });
    }
    if (eventId) {
      console.log("processWebhookEvent (other live_event) START for matchId:", matchId, "eventId:", eventId);
      try {
        const res = await ProcessedFixture.create({ matchId, eventId, type: "live_event" });
        console.log("ProcessedFixture (other live_event) INSERTED id:", res._id);
      } catch (e) {
        console.error("ProcessedFixture (other live_event) INSERT ERROR:", e);
      }
    }
  } catch (err) {
    console.error("processWebhookEvent error:", err);
    throw err;
  }
};

/**
 * processTournamentAward
 */
export const processTournamentAward = async (awardType, userId) => {
  try {
    await applyTournamentAwardPoints(awardType, userId, 5);
    if (globalThis.io) {
      globalThis.io.emit("tournament_award", { awardType, userId, points: 5 });
    }
  } catch (err) {
    console.error("processTournamentAward error:", err);
    throw err;
  }
};