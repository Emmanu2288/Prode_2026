import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { getMyPredictions } from "../services/prediction.service";
import useMatches from "../hooks/useMatches";
import BallIcon from "../components/BallIcon";

const statusColor = (points, status) => {
  if (status === "NS") return "bg-gray-100 text-gray-500";
  if (points === 3) return "bg-green-100 text-green-700";
  if (points === 1) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-500";
};

const statusLabel = (points, status) => {
  if (status === "NS") return "Pendiente";
  if (points === 3) return "✅ Exacto +3";
  if (points === 1) return "〰️ Ganador +1";
  return "❌ Sin puntos";
};

const Predictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { matches } = useMatches();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getMyPredictions()
      .then((res) => setPredictions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Mapa de matchId → fixture data
  const matchMap = matches.reduce((acc, m) => {
    acc[String(m.fixture.id)] = m;
    return acc;
  }, {});

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points || 0), 0);
  const predictedCount = predictions.filter((p) => p.matchId).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BallIcon className="w-9 h-9 mb-3 animate-bounce" />
          <p className="text-gray-500 text-sm">Cargando pronósticos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Mis pronósticos</h1>
            <p className="text-green-300 text-sm mt-1">{predictedCount} partidos pronosticados</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-white">{totalPoints}</p>
            <p className="text-green-300 text-xs mt-0.5">puntos totales</p>
          </div>
        </div>
      </div>

      {/* Stats personales */}
      {predictions.length > 0 && (() => {
        const matchPreds = predictions.filter(p => p.matchId && p.predictedScore);
        const finished   = matchPreds.filter(p => {
          const s = matchMap[p.matchId]?.fixture?.status?.short;
          return ["FT","AET","PEN"].includes(s);
        });
        const exact    = finished.filter(p => p.points >= 3).length;
        const winner   = finished.filter(p => p.points === 1).length;
        const wrong    = finished.filter(p => p.points === 0).length;
        const accuracy = finished.length > 0 ? Math.round(((exact + winner) / finished.length) * 100) : null;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Exactos",  value: exact,    icon: "🎯", color: "#16a34a" },
              { label: "Ganador",  value: winner,   icon: "✅", color: "#2563eb" },
              { label: "Fallados", value: wrong,    icon: "❌", color: "#dc2626" },
              { label: "Acierto",  value: accuracy !== null ? `${accuracy}%` : "—", icon: "📊", color: "#7c3aed" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-gray-100 text-center" style={{ padding: "14px 12px" }}>
                <p className="text-xl">{s.icon}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Mensaje de éxito */}
      {location.state?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm text-center font-medium">
          ✅ Pronóstico guardado correctamente
        </div>
      )}

      {/* Sin pronósticos */}
      {predictions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl">🎯</span>
          <p className="text-gray-600 font-medium mt-4">Todavía no hiciste ningún pronóstico</p>
          <p className="text-gray-400 text-sm mt-1">Andá a Partidos y presioná Pronosticar</p>
          <button
            onClick={() => navigate("/fixtures")}
            className="mt-5 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Ver partidos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((pred) => {
            const matchData = matchMap[pred.matchId];
            const status = matchData?.fixture?.status?.short || "NS";
            const teams = matchData?.teams;
            const goals = matchData?.goals;

            // Card de extras (sin matchId ni predictedScore)
            const isExtras = !pred.matchId && !pred.predictedScore;
            if (isExtras) {
              const items = [
                pred.worldChampion   && { icon: "🏆", label: "Campeón",    value: pred.worldChampion },
                pred.bestPlayer      && { icon: "⭐", label: "Golden Ball", value: pred.bestPlayer },
                pred.topScorer       && { icon: "👟", label: "Goleador",   value: pred.topScorer },
                pred.bestGoalkeeper  && { icon: "🧤", label: "Arquero",    value: pred.bestGoalkeeper },
              ].filter(Boolean);

              if (items.length === 0) return null;

              return (
                <div key={pred._id} className="bg-card rounded-xl border border-purple-100" style={{ padding: "14px 20px" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-purple-700">🎯 Extras</p>
                    <Link to="/extras" className="text-xs text-purple-500 hover:underline font-medium">
                      Ver / modificar →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {items.map((item) => (
                      <div key={item.label} className="bg-purple-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg">{item.icon}</p>
                        <p className="text-xs text-purple-500 font-medium mt-0.5">{item.label}</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={pred._id} className="bg-card rounded-xl border border-gray-100 flex items-center" style={{ padding: "12px 20px", gap: "16px" }}>
                {/* Equipos y logos */}
                {teams ? (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={teams.home.logo} alt={teams.home.name} className="w-8 h-8 object-contain flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {teams.home.name} vs {teams.away.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {matchData?.league?.round?.replace("Group Stage - ", "Fecha ")}
                      </p>
                    </div>
                    <img src={teams.away.logo} alt={teams.away.name} className="w-8 h-8 object-contain flex-shrink-0" />
                  </div>
                ) : null}

                {/* Scores */}
                {!isExtras && (
                  <div className="text-right flex-shrink-0" style={{ paddingRight: "4px" }}>
                    <div className="flex items-center gap-2">
                      {goals && status !== "NS" && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Real</p>
                          <p className="text-sm font-bold text-gray-700">{goals.home}–{goals.away}</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Mi prono</p>
                        <p className="text-sm font-bold text-green-600">{pred.predictedScore}</p>
                      </div>
                    </div>
                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(pred.points, status)}`}>
                      {statusLabel(pred.points, status)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Predictions;
