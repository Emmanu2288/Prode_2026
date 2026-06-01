import axios from "axios";
import User from "../models/User.js";
import Group from "../models/Group.js";
import Membership from "../models/Membership.js";
import Prediction from "../models/Prediction.js";
import ProcessedFixture from "../models/ProcessedFixture.js";
import { calculatePointsFinal, applyFinalPointsToPrediction, applyTournamentAwardPoints } from "../services/points.service.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;
const SEASON = process.env.API_SEASON || 2026;

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    // Para cada usuario: contar predicciones
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const predCount = await Prediction.countDocuments({
          user: u._id,
          matchId: { $exists: true }
        });
        return { ...u, predictionCount: predCount };
      })
    );

    // Ordenar por puntos desc
    usersWithStats.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    res.json(usersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Grupos ───────────────────────────────────────────────────────────────────

export const getAdminGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate("owner", "first_name last_name email").lean();
    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const memberCount = await Membership.countDocuments({ group: g._id });
        return { ...g, memberCount };
      })
    );
    res.json(groupsWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Premios del torneo ───────────────────────────────────────────────────────

/**
 * GET /api/admin/tournament-data
 * Obtiene automáticamente campeón y goleador desde la API
 */
export const getTournamentData = async (req, res) => {
  try {
    const results = { champion: null, topScorer: null };

    // Goleador — desde API
    try {
      const scorersRes = await axios.get(`${API_URL}/players/topscorers`, {
        params: { league: 1, season: SEASON },
        headers: { "x-apisports-key": API_KEY },
        timeout: 8000,
      });
      const top = scorersRes.data?.response?.[0];
      if (top) {
        results.topScorer = {
          name: top.player?.name,
          goals: top.statistics?.[0]?.goals?.total,
          team: top.statistics?.[0]?.team?.name,
          photo: top.player?.photo,
        };
      }
    } catch (e) {
      console.warn("topscorers fetch error:", e.message);
    }

    // Campeón — buscar partido de la final
    try {
      const finalRes = await axios.get(`${API_URL}/fixtures`, {
        params: { league: 1, season: SEASON, round: "Final" },
        headers: { "x-apisports-key": API_KEY },
        timeout: 8000,
      });
      const final = finalRes.data?.response?.[0];
      if (final && final.fixture?.status?.short === "FT") {
        const winner = final.teams?.home?.winner
          ? final.teams.home.name
          : final.teams?.away?.winner
          ? final.teams.away.name
          : null;
        results.champion = {
          name: winner,
          logo: final.teams?.home?.winner
            ? final.teams.home.logo
            : final.teams.away.logo,
        };
      }
    } catch (e) {
      console.warn("final fixture fetch error:", e.message);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/tournament-awards
 * Procesa los premios del torneo y asigna puntos a los usuarios que acertaron.
 * Body: { goldenBall: "Nombre", goldenGlove: "Nombre", triggerChampion: true, triggerTopScorer: true }
 */
export const processTournamentAwards = async (req, res) => {
  try {
    const { goldenBall, goldenGlove, triggerChampion, triggerTopScorer } = req.body;
    const results = [];

    const normalize = (s) =>
      String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

    // Obtener datos automáticos si se pidió
    let championName = null;
    let topScorerName = null;

    if (triggerChampion) {
      try {
        const r = await axios.get(`${API_URL}/fixtures`, {
          params: { league: 1, season: SEASON, round: "Final" },
          headers: { "x-apisports-key": API_KEY }, timeout: 8000,
        });
        const final = r.data?.response?.[0];
        if (final?.fixture?.status?.short === "FT") {
          championName = final.teams?.home?.winner ? final.teams.home.name : final.teams.away.name;
        }
      } catch (e) { console.warn(e.message); }
    }

    if (triggerTopScorer) {
      try {
        const r = await axios.get(`${API_URL}/players/topscorers`, {
          params: { league: 1, season: SEASON },
          headers: { "x-apisports-key": API_KEY }, timeout: 8000,
        });
        topScorerName = r.data?.response?.[0]?.player?.name;
      } catch (e) { console.warn(e.message); }
    }

    // Buscar extras de todos los usuarios
    const allExtras = await Prediction.find({
      matchId: { $exists: false },
      predictedScore: { $exists: false },
    }).lean();

    for (const extra of allExtras) {
      const awarded = [];

      if (championName && extra.worldChampion) {
        const nc = normalize(championName);
        const np = normalize(extra.worldChampion);
        if (nc.includes(np) || np.includes(nc)) {
          await applyTournamentAwardPoints("winner", extra.user, 5);
          awarded.push("Campeón +5pts");
        }
      }

      if (topScorerName && extra.topScorer) {
        const nc = normalize(topScorerName);
        const np = normalize(extra.topScorer);
        if (nc.includes(np) || np.includes(nc)) {
          await applyTournamentAwardPoints("top_scorer", extra.user, 5);
          awarded.push("Goleador +5pts");
        }
      }

      if (goldenBall && extra.bestPlayer) {
        const nc = normalize(goldenBall);
        const np = normalize(extra.bestPlayer);
        if (nc.includes(np) || np.includes(nc)) {
          await applyTournamentAwardPoints("best_player", extra.user, 5);
          awarded.push("Golden Ball +5pts");
        }
      }

      if (goldenGlove && extra.bestGoalkeeper) {
        const nc = normalize(goldenGlove);
        const np = normalize(extra.bestGoalkeeper);
        if (nc.includes(np) || np.includes(nc)) {
          await applyTournamentAwardPoints("best_goalkeeper", extra.user, 5);
          awarded.push("Golden Glove +5pts");
        }
      }

      if (awarded.length > 0) results.push({ userId: extra.user, awarded });
    }

    res.json({ processed: allExtras.length, pointsAwarded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── MVP manual por partido ───────────────────────────────────────────────────

/**
 * GET /api/admin/finished-matches
 * Devuelve partidos finalizados que no han tenido MVP procesado manualmente
 */
export const getFinishedMatches = async (req, res) => {
  try {
    const r = await axios.get(`${API_URL}/fixtures`, {
      params: { league: 1, season: SEASON, status: "FT" },
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });
    const matches = (r.data?.response || []).map((m) => ({
      id: m.fixture.id,
      date: m.fixture.date,
      home: { name: m.teams.home.name, logo: m.teams.home.logo, id: m.teams.home.id },
      away: { name: m.teams.away.name, logo: m.teams.away.logo, id: m.teams.away.id },
      score: `${m.goals.home}-${m.goals.away}`,
      round: m.league.round,
    }));
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/mvp/:fixtureId
 * Setea el MVP manualmente y recalcula puntos para ese partido
 */
export const setManualMvp = async (req, res) => {
  try {
    const { fixtureId } = req.params;
    const { mvpName, finalScore } = req.body;

    if (!mvpName) return res.status(400).json({ error: "mvpName requerido" });

    // Obtener resultado final del partido
    let finalGoals = { home: 0, away: 0 };
    if (finalScore) {
      const [h, a] = finalScore.split("-").map(Number);
      finalGoals = { home: h, away: a };
    } else {
      try {
        const r = await axios.get(`${API_URL}/fixtures`, {
          params: { id: fixtureId },
          headers: { "x-apisports-key": API_KEY }, timeout: 8000,
        });
        const f = r.data?.response?.[0];
        if (f) finalGoals = f.goals;
      } catch (e) { console.warn(e.message); }
    }

    // Buscar predicciones del partido
    const preds = await Prediction.find({ matchId: String(fixtureId) });
    const normalize = (s) =>
      String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

    let updated = 0;
    for (const pred of preds) {
      const points = calculatePointsFinal(pred, finalGoals, mvpName);
      await applyFinalPointsToPrediction(pred, points);
      updated++;
    }

    // Marcar como procesado manualmente
    await ProcessedFixture.findOneAndUpdate(
      { matchId: String(fixtureId), type: "scored" },
      { matchId: String(fixtureId), type: "scored", manualMvp: mvpName },
      { upsert: true }
    );

    res.json({ mvp: mvpName, predictionsUpdated: updated, finalGoals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
