import cron from "node-cron";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import GroupPoints from "../models/GroupPoints.js";
import ProcessedFixture from "../models/ProcessedFixture.js";
import Correction from "../models/Correction.js";
import { getWorldCup2026Matches, getFixtureMvp } from "./match.service.js";
import { calculatePointsFinal } from "./points.service.js";
import { captureException, slackAlert } from "../utils/alerts.js";
import { sendPushToAll } from "./push.service.js";

// Registro de partidos ya notificados para no repetir
const notifiedMatches = new Set();
// Flag para no enviar el recordatorio de Extras más de una vez
let extraReminderSent = false;

const CORRECTION_ALERT_THRESHOLD = Number(process.env.CORRECTION_ALERT_THRESHOLD || 10);
const MAX_PARALLEL_USERS = Number(process.env.MAX_PARALLEL_USERS || 50);

const applyCorrection = async ({ matchId, predId, userId, before, after, diff, reason }) => {
  try {
    if (predId) {
      await Prediction.findByIdAndUpdate(predId, { $set: { points: after } });
    }

    if (userId && diff !== 0) {
      const memberships = await Membership.find({ user: userId }).lean();
      for (const mem of memberships) {
        await GroupPoints.findOneAndUpdate(
          { group: mem.group, user: userId },
          { $inc: { points: diff }, $set: { lastUpdated: new Date() } },
          { upsert: true }
        );
      }
      await User.findByIdAndUpdate(userId, { $inc: { totalPoints: diff } });
    }

    await Correction.create({
      matchId,
      predictionId: predId,
      userId,
      field: "points",
      before,
      after,
      diff,
      reason,
      processedBy: "reconciler"
    });
  } catch (err) {
    console.error("applyCorrection error:", err);
    captureException(err);
    try {
      await Correction.create({
        matchId,
        predictionId: predId,
        userId,
        field: "points",
        before,
        after,
        diff,
        reason: `reconciler_error: ${err.message}`,
        processedBy: "reconciler"
      });
    } catch (e) {
      console.error("Failed to log failed correction:", e);
      captureException(e);
    }
  }
};

export const reconcileMatch = async (fixture) => {
  const matchId = String(fixture.fixture?.id ?? fixture.id);
  const finalGoals = fixture.goals ?? fixture.score ?? { home: 0, away: 0 };
  const statusShort = fixture.fixture?.status?.short ?? fixture.status?.short ?? null;
  const winnerTeam = fixture.teams?.home?.winner
    ? fixture.teams.home.name
    : fixture.teams?.away?.winner
    ? fixture.teams.away.name
    : null;
  const finalMvp = fixture.mvp ?? await getFixtureMvp(matchId);

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

  // Buscar predicciones por matchId (string) en lugar de match (ObjectId)
  const preds = await Prediction.find({ matchId }).lean();
  if (!preds || preds.length === 0) {
    await ProcessedFixture.create({ matchId, type: "scored" }).catch(() => {});
    return { matchId, checked: 0, corrections: 0 };
  }

  let corrections = 0;

  for (let i = 0; i < preds.length; i += MAX_PARALLEL_USERS) {
    const batch = preds.slice(i, i + MAX_PARALLEL_USERS);
    await Promise.all(batch.map(async (pred) => {
      try {
        const expectedPoints = calculatePointsFinal(pred, finalGoals, finalMvp, { statusShort, winnerTeam });
        const currentPoints = Number(pred.points ?? 0);
        if (currentPoints === expectedPoints) return;

        const diff = expectedPoints - currentPoints;

        await applyCorrection({
          matchId,
          predId: pred._id,
          userId: pred.user,
          before: currentPoints,
          after: expectedPoints,
          diff,
          reason: "reconciler_api_vs_db"
        });

        corrections += 1;
      } catch (err) {
        console.error(`Error reconciling prediction ${pred._id} for match ${matchId}:`, err);
        captureException(err);
      }
    }));
  }

  if (globalThis.io) {
    try {
      globalThis.io.to(`match_${matchId}`).emit("match_reconciled", { matchId, finalGoals, corrections });
    } catch (e) {
      console.warn("Socket emit failed for match_reconciled:", e?.message || e);
    }
  }

  try {
    await ProcessedFixture.create({ matchId, type: "scored", mvp: finalMvp });
  } catch (e) {}

  if (corrections > CORRECTION_ALERT_THRESHOLD) {
    const msg = `⚠️ High corrections for match ${matchId}: ${corrections}. Check Correction collection.`;
    console.warn(msg);
    slackAlert(msg).catch(() => {});
  }

  return { matchId, checked: preds.length, corrections };
};

export const scheduleFinalizeMatchesReconciler = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Cron reconciler: buscando partidos finalizados (FT/AET/PEN) para reconciliar...");

    try {
      const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);

      // FT-AET-PEN: partidos terminados en tiempo reglamentario, alargue o penales —
      // antes solo se buscaba "FT", dejando sin reconciliar (red de seguridad) los
      // partidos de fase eliminatoria que terminan en alargue o penales si el
      // webhook en vivo no llegaba a procesarlos.
      const fixtures = await getWorldCup2026Matches({ params: { status: "FT-AET-PEN", from, to } });
      const list = Array.isArray(fixtures) ? fixtures : [];

      if (!list.length) return;

      let totalChecked = 0;
      let totalCorrections = 0;
      const problematicMatches = [];

      for (const fixture of list) {
        const matchId = String(fixture.fixture?.id ?? fixture.id);
        try {
          const already = await ProcessedFixture.findOne({ matchId, type: "scored" });
          if (already) {
            // Comprobar existencia de predicciones por matchId (string)
            const anyPredWithPoints = await Prediction.exists({ matchId, points: { $exists: true, $ne: null } });
            if (!anyPredWithPoints) {
              const res = await reconcileMatch(fixture);
              totalChecked += res.checked;
              totalCorrections += res.corrections;
              if (res.corrections > CORRECTION_ALERT_THRESHOLD) problematicMatches.push(res.matchId);
            }
            continue;
          }

          const res = await reconcileMatch(fixture);
          totalChecked += res.checked;
          totalCorrections += res.corrections;
          if (res.corrections > CORRECTION_ALERT_THRESHOLD) problematicMatches.push(res.matchId);
        } catch (err) {
          console.error(`Error processing fixture ${matchId} in reconciler:`, err);
          captureException(err);
        }
      }

      console.log(`✅ Reconciler run complete. Matches checked: ${totalChecked}. Corrections applied: ${totalCorrections}.`);
      if (problematicMatches.length) {
        const msg = `⚠️ Matches with high correction count: ${problematicMatches.join(", ")}`;
        console.warn(msg);
        slackAlert(msg).catch(() => {});
      }
    } catch (err) {
      console.error("Reconciler cron error:", err);
      captureException(err);
    }
  });
};

// Cron: notificación push 1 hora antes de cada partido
const scheduleMatchReminders = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const matches = await getWorldCup2026Matches();
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      for (const match of matches) {
        if (match.fixture?.status?.short !== "NS") continue;
        const matchTime = new Date(match.fixture.date);
        const matchId = String(match.fixture.id);

        // Si el partido empieza entre ahora+5min y ahora+1hora → notificar
        if (matchTime > fiveMinFromNow && matchTime <= oneHourFromNow && !notifiedMatches.has(matchId)) {
          notifiedMatches.add(matchId);
          const home = match.teams?.home?.name;
          const away = match.teams?.away?.name;
          const timeStr = matchTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

          await sendPushToAll({
            title: "⚽ ¡Partido en 1 hora!",
            body: `${home} vs ${away} empieza a las ${timeStr}. ¡Pronosticá antes que empiece!`,
            url: "/fixtures",
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("scheduleMatchReminders error:", err.message);
    }
  });
};

// Cron: recordatorio push 24h antes de que cierren los Extras (inicio de octavos)
const scheduleExtrasReminder = () => {
  // Se ejecuta cada hora para no depender de que el servidor esté corriendo a medianoche exacta
  cron.schedule("0 * * * *", async () => {
    if (extraReminderSent) return;
    try {
      const matches = await getWorldCup2026Matches();
      const firstR16 = matches
        .filter((m) => m.league.round === "Round of 16" && m.fixture.status.short === "NS")
        .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))[0];

      if (!firstR16) return;

      const r16Date = new Date(firstR16.fixture.date);
      const hoursUntil = (r16Date - new Date()) / (1000 * 60 * 60);

      // Ventana: entre 20h y 28h antes del primer octavo
      if (hoursUntil > 0 && hoursUntil <= 28 && hoursUntil >= 20) {
        extraReminderSent = true;
        await sendPushToAll({
          title: "⏰ ¡Últimas horas para los Extras!",
          body: "Mañana empiezan los octavos. ¡Completá tus pronósticos extras antes que cierren!",
          url: "/extras",
        });
        console.log("Extras reminder enviado. Primer octavo:", r16Date.toISOString());
      }
    } catch (err) {
      console.error("scheduleExtrasReminder error:", err.message);
    }
  });
};

export const scheduleMatchStatusCheck = () => {
  scheduleFinalizeMatchesReconciler();
  scheduleMatchReminders();
  scheduleExtrasReminder();
};