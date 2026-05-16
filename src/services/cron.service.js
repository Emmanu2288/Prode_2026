import cron from "node-cron";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import GroupPoints from "../models/GroupPoints.js";
import ProcessedFixture from "../models/ProcessedFixture.js";
import Correction from "../models/Correction.js";
import { getWorldCup2026Matches } from "./match.service.js";
import { calculatePointsFinal } from "./points.service.js";
import { captureException, slackAlert } from "../utils/alerts.js";

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
  const finalMvp = fixture.mvp ?? null;

  const preds = await Prediction.find({ match: matchId }).lean();
  if (!preds || preds.length === 0) {
    await ProcessedFixture.create({ matchId, type: "scored" }).catch(() => {});
    return { matchId, checked: 0, corrections: 0 };
  }

  let corrections = 0;

  for (let i = 0; i < preds.length; i += MAX_PARALLEL_USERS) {
    const batch = preds.slice(i, i + MAX_PARALLEL_USERS);
    await Promise.all(batch.map(async (pred) => {
      try {
        const expectedPoints = calculatePointsFinal(pred, finalGoals, finalMvp);
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
    await ProcessedFixture.create({ matchId, type: "scored" });
  } catch (e) {}

  if (corrections > CORRECTION_ALERT_THRESHOLD) {
    const msg = `⚠️ High corrections for match ${matchId}: ${corrections}. Check Correction collection.`;
    console.warn(msg);
    slackAlert(msg).catch(() => {});
  }

  return { matchId, checked: preds.length, corrections };
};

export const scheduleFinalizeMatchesReconciler = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("⏰ Cron reconciler: buscando partidos FT para reconciliar...");

    try {
      const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);

      const fixtures = await getWorldCup2026Matches({ params: { status: "FT", from, to } });
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
            const anyPredWithPoints = await Prediction.exists({ match: matchId, points: { $exists: true, $ne: null } });
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

export const scheduleMatchStatusCheck = () => {
  scheduleFinalizeMatchesReconciler();
};