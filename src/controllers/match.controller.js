import axios from "axios";
import { getWorldCup2026Matches } from "../services/match.service.js";

const API_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY;

// Controlador para obtener partidos desde la API externa
export const getMatches = async (req, res) => {
  try {
    const { leagueId, season } = req.query;
    const matches = await getWorldCup2026Matches({ leagueId, season });
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
