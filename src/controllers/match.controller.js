import axios from "axios";
import { getWorldCup2026Matches, getWorldCupStandings, getFixtureMvp } from "../services/match.service.js";
import ProcessedFixture from "../models/ProcessedFixture.js";
import Prediction from "../models/Prediction.js";
import { calculatePointsFinal, applyFinalPointsToPrediction } from "../services/points.service.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;
const SEASON = process.env.API_SEASON || 2026;

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

// Controlador para obtener partidos desde la API externa
export const getMatches = async (req, res) => {
  try {
    const { leagueId, season } = req.query;
    const matches = await getWorldCup2026Matches({ leagueId, season });

    // Adjuntar la figura (MVP real) a los partidos finalizados, visible para todos
    const finishedIds = matches
      .filter((m) => FINISHED_STATUSES.has(m.fixture.status.short))
      .map((m) => String(m.fixture.id));

    if (finishedIds.length) {
      const scoredDocs = await ProcessedFixture.find({
        matchId: { $in: finishedIds },
        type: "scored",
      }).lean();

      const mvpByMatch = {};
      for (const doc of scoredDocs) {
        if (doc.mvp) {
          mvpByMatch[doc.matchId] = doc.mvp;
        } else {
          // Partido ya procesado pero sin figura calculada todavía
          // (las calificaciones de api-football tardan unos minutos en publicarse)
          const mvp = await getFixtureMvp(doc.matchId);
          if (mvp) {
            mvpByMatch[doc.matchId] = mvp;
            await ProcessedFixture.updateOne({ _id: doc._id }, { $set: { mvp } });

            // La figura recién quedó disponible: al momento del scoring inicial
            // finalMvp era null, así que nadie pudo cobrar el bonus de MVP.
            // Recalcular puntos de las predicciones de este partido con la figura real.
            const match = matches.find((m) => String(m.fixture.id) === doc.matchId);
            const finalGoals = match?.goals ?? { home: 0, away: 0 };
            const preds = await Prediction.find({ matchId: doc.matchId });
            for (const pred of preds) {
              const points = calculatePointsFinal(pred, finalGoals, mvp);
              await applyFinalPointsToPrediction(pred, points);
            }
          }
        }
      }

      for (const m of matches) {
        const mvp = mvpByMatch[String(m.fixture.id)];
        if (mvp) m.mvp = mvp;
      }
    }

    return res.json(matches);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Devuelve los jugadores de ambos equipos para un fixture.
 * Intenta primero con el lineup del fixture (disponible ~1h antes del partido).
 * Si no hay lineup, usa el plantel del equipo (/players?team=X&season=2026).
 */
export const getFixturePlayers = async (req, res) => {
  try {
    const { fixtureId } = req.params;

    // 1. Intentar obtener lineup del fixture
    const fixtureRes = await axios.get(`${API_URL}/fixtures`, {
      params: { id: fixtureId },
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });

    const fixture = fixtureRes.data?.response?.[0];
    if (!fixture) return res.status(404).json({ error: "Fixture no encontrado" });

    const homeId = fixture.teams?.home?.id;
    const awayId = fixture.teams?.away?.id;
    const homeName = fixture.teams?.home?.name;
    const awayName = fixture.teams?.away?.name;

    // 2. Si hay lineups, extraer jugadores de ahí
    const lineups = fixture.lineups || [];
    if (lineups.length === 2) {
      const formatLineup = (team) => ({
        team: team.team?.name,
        players: [
          ...(team.startXI || []).map((e) => ({
            id: e.player?.id,
            name: e.player?.name,
            number: e.player?.number,
            pos: e.player?.pos,
            starter: true,
          })),
          ...(team.substitutes || []).map((e) => ({
            id: e.player?.id,
            name: e.player?.name,
            number: e.player?.number,
            pos: e.player?.pos,
            starter: false,
          })),
        ],
      });
      return res.json({
        source: "lineup",
        home: formatLineup(lineups[0]),
        away: formatLineup(lineups[1]),
      });
    }

    // 3. Sin lineup: usar plantel actual de cada equipo.
    // /players?season= solo devuelve jugadores con estadísticas registradas
    // en esa temporada para ese equipo, y al arrancar el torneo todavía no
    // jugaron nada (plantel incompleto). /players/squads devuelve el plantel
    // registrado completo, sin depender de stats.
    const [homeRes, awayRes] = await Promise.all([
      axios.get(`${API_URL}/players/squads`, {
        params: { team: homeId },
        headers: { "x-apisports-key": API_KEY },
        timeout: 8000,
      }),
      axios.get(`${API_URL}/players/squads`, {
        params: { team: awayId },
        headers: { "x-apisports-key": API_KEY },
        timeout: 8000,
      }),
    ]);

    const formatSquad = (teamName, data) => ({
      team: teamName,
      players: (data.response?.[0]?.players || []).map((p) => ({
        id: p.id,
        name: p.name,
        pos: p.position,
        starter: null,
      })),
    });

    return res.json({
      source: "squad",
      home: formatSquad(homeName, homeRes.data),
      away: formatSquad(awayName, awayRes.data),
    });
  } catch (err) {
    console.error("getFixturePlayers error:", err.message);
    return res.status(500).json({ error: "Error al obtener jugadores" });
  }
};

// Cache en memoria para no repetir la consulta a la API por cada usuario
// que tiene la pantalla del partido abierta (todos comparten el mismo dato)
const eventsCache = new Map(); // fixtureId -> { data, ts }
const EVENTS_CACHE_TTL = 45_000;

/**
 * Devuelve los eventos de un fixture (goles, tarjetas, cambios).
 */
export const getFixtureEvents = async (req, res) => {
  try {
    const { fixtureId } = req.params;

    const cached = eventsCache.get(fixtureId);
    if (cached && Date.now() - cached.ts < EVENTS_CACHE_TTL) {
      return res.json(cached.data);
    }

    const response = await axios.get(`${API_URL}/fixtures/events`, {
      params: { fixture: fixtureId },
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });

    const data = response.data?.response || [];
    eventsCache.set(fixtureId, { data, ts: Date.now() });
    return res.json(data);
  } catch (err) {
    console.error("getFixtureEvents error:", err.message);
    return res.status(500).json({ error: "Error al obtener eventos del partido" });
  }
};

/**
 * Devuelve los últimos enfrentamientos directos entre dos equipos.
 */
export const getHeadToHead = async (req, res) => {
  try {
    const { team1, team2 } = req.query;
    if (!team1 || !team2) {
      return res.status(400).json({ error: "Faltan team1 y team2" });
    }

    const response = await axios.get(`${API_URL}/fixtures/headtohead`, {
      params: { h2h: `${team1}-${team2}`, last: 5, status: "FT-AET-PEN" },
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });

    return res.json(response.data?.response || []);
  } catch (err) {
    console.error("getHeadToHead error:", err.message);
    return res.status(500).json({ error: "Error al obtener historial entre equipos" });
  }
};

// Cache en memoria: la tabla y los goleadores solo cambian cuando termina un partido
let standingsCache = { data: null, ts: 0 };
const STANDINGS_CACHE_TTL = 5 * 60_000;

/**
 * Devuelve la tabla de posiciones por grupo + el top 5 de goleadores.
 */
export const getStandings = async (req, res) => {
  try {
    if (standingsCache.data && Date.now() - standingsCache.ts < STANDINGS_CACHE_TTL) {
      return res.json(standingsCache.data);
    }

    const [standings, scorersRes] = await Promise.all([
      getWorldCupStandings(),
      axios.get(`${API_URL}/players/topscorers`, {
        params: { league: 1, season: SEASON },
        headers: { "x-apisports-key": API_KEY },
        timeout: 8000,
      }).catch((err) => {
        console.warn("getStandings: topscorers fetch error:", err.message);
        return { data: { response: [] } };
      }),
    ]);

    const topScorers = (scorersRes.data?.response || []).slice(0, 5).map((entry) => ({
      name: entry.player?.name,
      photo: entry.player?.photo,
      team: entry.statistics?.[0]?.team?.name,
      teamLogo: entry.statistics?.[0]?.team?.logo,
      goals: entry.statistics?.[0]?.goals?.total ?? 0,
      assists: entry.statistics?.[0]?.goals?.assists ?? 0,
    }));

    const data = { standings, topScorers };
    standingsCache = { data, ts: Date.now() };
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Cache en memoria: evita repetir las llamadas pesadas (topscorers + topassists + stats individuales)
let goldenBoyCache = { data: null, ts: 0 };
const GOLDEN_BOY_CACHE_TTL = 10 * 60_000;

/**
 * GET /api/matches/golden-boy-candidates
 * Devuelve jugadores Sub-21 destacados (goleadores + asistencias) con datos
 * adicionales (veces MVP, intercepciones, duelos ganados), para ayudar a los
 * usuarios a elegir su pronóstico de "Mejor Jugador Joven" (Golden Boy) en Extras.
 * Es solo informativo: no determina el ganador del premio.
 */
export const getGoldenBoyCandidates = async (req, res) => {
  try {
    if (goldenBoyCache.data && Date.now() - goldenBoyCache.ts < GOLDEN_BOY_CACHE_TTL) {
      return res.json(goldenBoyCache.data);
    }

    const AGE_LIMIT = 21;

    const [scorersRes, assistsRes] = await Promise.all([
      axios.get(`${API_URL}/players/topscorers`, {
        params: { league: 1, season: SEASON },
        headers: { "x-apisports-key": API_KEY }, timeout: 8000,
      }).catch((e) => { console.warn("topscorers error:", e.message); return { data: { response: [] } }; }),
      axios.get(`${API_URL}/players/topassists`, {
        params: { league: 1, season: SEASON },
        headers: { "x-apisports-key": API_KEY }, timeout: 8000,
      }).catch((e) => { console.warn("topassists error:", e.message); return { data: { response: [] } }; }),
    ]);

    const merged = new Map();
    for (const entry of [...(scorersRes.data?.response || []), ...(assistsRes.data?.response || [])]) {
      const p = entry.player;
      if (!p || (p.age ?? 99) > AGE_LIMIT) continue;
      const stats = entry.statistics?.[0];
      const existing = merged.get(p.id) || {
        id: p.id,
        name: p.name,
        photo: p.photo,
        age: p.age,
        team: stats?.team?.name,
        teamLogo: stats?.team?.logo,
        goals: 0,
        assists: 0,
      };
      existing.goals = Math.max(existing.goals, stats?.goals?.total ?? 0);
      existing.assists = Math.max(existing.assists, stats?.goals?.assists ?? 0);
      merged.set(p.id, existing);
    }

    const candidates = Array.from(merged.values());

    // Veces que fue figura del partido (MVP) — ya está en nuestra base, sin gastar requests
    const normalize = (s) =>
      String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const scoredDocs = await ProcessedFixture.find({ type: "scored", mvp: { $ne: null } }).select("mvp").lean();
    const mvpNames = scoredDocs.map((d) => normalize(d.mvp));
    for (const c of candidates) {
      const nc = normalize(c.name);
      c.mvpCount = mvpNames.filter((m) => m.includes(nc) || nc.includes(m)).length;
    }

    // Intercepciones y duelos ganados (estadística individual, una llamada por candidato).
    // Secuencial para no disparar varias requests en simultáneo contra el límite de la API.
    for (const c of candidates) {
      try {
        const r = await axios.get(`${API_URL}/players`, {
          params: { id: c.id, league: 1, season: SEASON },
          headers: { "x-apisports-key": API_KEY }, timeout: 8000,
        });
        const stats = r.data?.response?.[0]?.statistics?.[0];
        c.interceptions = stats?.tackles?.interceptions ?? null;
        c.duelsWon = stats?.duels?.won ?? null;
      } catch (e) {
        console.warn(`player stats error (${c.name}):`, e.message);
        c.interceptions = null;
        c.duelsWon = null;
      }
    }

    candidates.sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));

    goldenBoyCache = { data: candidates, ts: Date.now() };
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
