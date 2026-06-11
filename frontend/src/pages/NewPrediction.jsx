import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPrediction, updatePrediction, getMyPredictions } from "../services/prediction.service";
import { getFixturePlayers } from "../services/match.service";

const ScoreInput = ({ value, onChange, label }) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition-colors flex items-center justify-center"
      >−</button>
      <span className="text-4xl font-bold text-gray-800 w-12 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        className="w-9 h-9 rounded-full bg-green-100 hover:bg-green-200 text-green-700 font-bold text-lg transition-colors flex items-center justify-center"
      >+</button>
    </div>
  </div>
);

const NewPrediction = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const match = location.state?.match;

  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [mvpPlayer, setMvpPlayer] = useState("");
  const [players, setPlayers] = useState(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [mvpTeam, setMvpTeam] = useState(null); // "home" | "away" | null
  const [mvpSearch, setMvpSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingPrediction, setExistingPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Extraer fixture ANTES del useEffect para evitar problemas de closure
  const fixture = match?.fixture;
  const teams   = match?.teams;
  const league  = match?.league;
  const fixtureId = fixture?.id;

  // Al cargar, verificar si ya hay un pronóstico para este partido
  useEffect(() => {
    if (!fixtureId) { setCheckingExisting(false); return; }
    getMyPredictions()
      .then((res) => {
        const found = res.data.find((p) =>
          String(p.matchId) === String(fixtureId) ||
          String(p.match)   === String(fixtureId)
        );
        if (found) {
          setExistingPrediction(found);
          const [h, a] = (found.predictedScore || "0-0").split("-").map(Number);
          setHomeGoals(isNaN(h) ? 0 : h);
          setAwayGoals(isNaN(a) ? 0 : a);
          setMvpPlayer(found.mvpPlayer || "");
        }
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false));
  }, [fixtureId]);

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Partido no encontrado.</p>
        <button onClick={() => navigate("/fixtures")} className="mt-4 text-green-600 hover:underline text-sm">
          Volver a partidos
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const score = `${homeGoals}-${awayGoals}`;
      // El backend hace upsert: crea si no existe, actualiza si ya existe
      await createPrediction({ match: fixtureId, predictedScore: score, mvpPlayer });
      navigate("/predictions", { state: { success: true } });
    } catch (err) {
      const msg = err.response?.data?.error || "Error al guardar el pronóstico";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cargar jugadores de ambos equipos
  useEffect(() => {
    if (!match) return;
    setLoadingPlayers(true);
    getFixturePlayers(fixture.id)
      .then((res) => setPlayers(res.data))
      .catch(() => setPlayers(null))
      .finally(() => setLoadingPlayers(false));
  }, []);

  // Carga el script del widget de api-football si no está ya
  useEffect(() => {
    const scriptId = "api-football-widget-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://widgets.api-sports.io/2.0.3/widgets.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (checkingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto" }} className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Volver
      </button>

      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-slate-800 to-green-900 px-6 py-4 text-center">
          {existingPrediction && (
            <div className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full mb-2">
              ✏️ Editando pronóstico existente
            </div>
          )}
          <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-1">
            {league.round.replace("Group Stage - ", "Fase de grupos · Fecha ")}
          </p>
          <p className="text-white text-xs opacity-70">
            {new Date(fixture.date).toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            })} · {new Date(fixture.date).toLocaleTimeString("es-AR", {
              hour: "2-digit", minute: "2-digit", hour12: false,
            })}
          </p>
          {fixture.venue.name && (
            <p className="text-green-300 text-xs mt-1 opacity-80">
              📍 {fixture.venue.name}
            </p>
          )}
        </div>

        {/* Equipos */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center gap-2 flex-1">
              <img src={teams.home.logo} alt={teams.home.name} className="w-16 h-16 object-contain" />
              <span className="text-sm font-semibold text-gray-700 text-center">{teams.home.name}</span>
            </div>
            <span className="text-gray-300 font-light text-2xl">vs</span>
            <div className="flex flex-col items-center gap-2 flex-1">
              <img src={teams.away.logo} alt={teams.away.name} className="w-16 h-16 object-contain" />
              <span className="text-sm font-semibold text-gray-700 text-center">{teams.away.name}</span>
            </div>
          </div>

          {/* Historial entre los equipos (H2H) */}
          <div className="bg-card rounded-xl border border-gray-100 p-4 mb-6">
            <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">
              📊 Historial entre los equipos
            </p>
            <div
              id="wg-api-football-h2h"
              data-host="v3.football.api-sports.io"
              data-key={import.meta.env.VITE_FOOTBALL_API_KEY}
              data-date={fixture.date.split("T")[0]}
              data-team-a={teams.home.id}
              data-team-b={teams.away.id}
              data-theme=""
              data-show-errors="false"
              data-show-logos="true"
              className="wg_loader"
            />
          </div>

          {/* Marcador */}
          <form onSubmit={handleSubmit}>
            <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-5 font-medium">
              Tu pronóstico
            </p>

            <div className="flex items-center justify-center" style={{ gap: "clamp(0.75rem, 3vw, 1.5rem)" }}>
              <ScoreInput value={homeGoals} onChange={setHomeGoals} label={teams.home.name} />
              <span className="text-3xl font-bold text-gray-300 mt-5">—</span>
              <ScoreInput value={awayGoals} onChange={setAwayGoals} label={teams.away.name} />
            </div>

            {/* Resultado pronóstico resumido */}
            <div className="mt-6 bg-green-50 border border-green-100 rounded-xl py-3 text-center">
              <span className="text-green-700 font-bold text-2xl">
                {homeGoals} — {awayGoals}
              </span>
              <p className="text-green-500 text-xs mt-1">
                {homeGoals > awayGoals
                  ? `Ganador: ${teams.home.name}`
                  : homeGoals < awayGoals
                  ? `Ganador: ${teams.away.name}`
                  : "Empate"}
              </p>
            </div>

            {/* Superior Player of the Match (MVP) */}
            <div className="mt-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                ⭐ Superior Player of the Match (MVP)
                <span className="text-gray-400 font-normal normal-case" style={{ marginLeft: "8px" }}>(+2 pts si acertás)</span>
              </label>

              {loadingPlayers ? (
                <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400">
                  Cargando jugadores...
                </div>
              ) : players ? (
                <div className="space-y-2">
                  {/* Jugador seleccionado */}
                  {mvpPlayer && (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-semibold text-green-700">⭐ {mvpPlayer}</span>
                      <button
                        type="button"
                        onClick={() => { setMvpPlayer(""); setMvpTeam(null); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-3"
                      >✕ Cambiar</button>
                    </div>
                  )}

                  {/* Paso 1: elegir equipo */}
                  {!mvpPlayer && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setMvpTeam(mvpTeam === "home" ? null : "home"); setMvpSearch(""); }}
                        className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          mvpTeam === "home"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-green-300 text-gray-700"
                        }`}
                      >
                        <img src={teams.home.logo} alt="" className="w-6 h-6 object-contain" />
                        <span className="truncate">{teams.home.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMvpTeam(mvpTeam === "away" ? null : "away"); setMvpSearch(""); }}
                        className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          mvpTeam === "away"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-green-300 text-gray-700"
                        }`}
                      >
                        <img src={teams.away.logo} alt="" className="w-6 h-6 object-contain" />
                        <span className="truncate">{teams.away.name}</span>
                      </button>
                    </div>
                  )}

                  {/* Paso 2: lista de jugadores del equipo elegido */}
                  {mvpTeam && !mvpPlayer && (() => {
                    const list = players[mvpTeam]?.players || [];
                    const POS_ES = {
                      G: "Portero", Goalkeeper: "Portero",
                      D: "Defensor", Defender: "Defensor",
                      M: "Mediocampista", Midfielder: "Mediocampista",
                      F: "Delantero", A: "Delantero", Attacker: "Delantero", Forward: "Delantero",
                    };
                    const filtered = mvpSearch
                      ? list.filter((p) => p.name?.toLowerCase().includes(mvpSearch.toLowerCase()))
                      : list;
                    return (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                          <input
                            autoFocus
                            type="text"
                            value={mvpSearch}
                            onChange={(e) => setMvpSearch(e.target.value)}
                            placeholder="Buscar jugador..."
                            className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                          {filtered.map((p) => (
                            <button
                              key={p.id || p.name}
                              type="button"
                              onClick={() => { setMvpPlayer(p.name); setMvpTeam(null); }}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-green-50 transition-colors text-left"
                            >
                              <span className="text-gray-800">{p.name}</span>
                              {p.pos && (
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                  {POS_ES[p.pos] || p.pos}
                                </span>
                              )}
                            </button>
                          ))}
                          {filtered.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <input
                  type="text"
                  value={mvpPlayer}
                  onChange={(e) => setMvpPlayer(e.target.value)}
                  placeholder="Ej: Messi, Mbappé, Vinicius..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">
                Se determina por el jugador con mayor rating al finalizar el partido
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? "Guardando..." : existingPrediction ? "✏️ Actualizar pronóstico" : "⚽ Confirmar pronóstico"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewPrediction;
