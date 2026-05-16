import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/config/db.js";
import { getWorldCup2026Matches } from "../src/services/match.service.js";
import ProcessedFixture from "../src/models/ProcessedFixture.js";
import { reconcileMatch } from "../src/services/cron.service.js";
import { initMonitoring } from "../src/utils/alerts.js";

const FROM_DAYS = Number(process.env.BACKFILL_FROM_DAYS || 30);
const BATCH_DELAY_MS = Number(process.env.BACKFILL_BATCH_DELAY_MS || 200);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runBackfill = async () => {
  try {
    initMonitoring();
    await connectDB();

    const fromDate = new Date(Date.now() - FROM_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const toDate = new Date().toISOString().slice(0,10);

    console.log(`Backfill: consultando fixtures FT desde ${fromDate} hasta ${toDate}...`);
    const fixtures = await getWorldCup2026Matches({ params: { status: "FT", from: fromDate, to: toDate } });
    const list = Array.isArray(fixtures) ? fixtures : [];

    console.log(`Backfill: encontrados ${list.length} fixtures FT.`);

    for (const fixture of list) {
      const matchId = String(fixture.fixture?.id ?? fixture.id);
      const already = await ProcessedFixture.findOne({ matchId, type: "scored" });
      if (already) {
        console.log(`Skip ${matchId} (ya marcado).`);
        continue;
      }

      console.log(`Backfill: reconciliando match ${matchId}...`);
      try {
        const res = await reconcileMatch(fixture);
        console.log(`Backfill: match ${matchId} reconciled. checked=${res.checked} corrections=${res.corrections}`);
      } catch (err) {
        console.error(`Backfill: error reconciling ${matchId}:`, err);
      }

      await sleep(BATCH_DELAY_MS);
    }

    console.log("Backfill completo.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill error:", err);
    process.exit(1);
  }
};

runBackfill();