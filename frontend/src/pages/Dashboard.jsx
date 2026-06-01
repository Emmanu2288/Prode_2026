import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useMatches from "../hooks/useMatches";
import { getMyPredictions } from "../services/prediction.service";
import { getMyGroups, getGroupLeaderboard } from "../services/group.service";

// Días hasta el inicio del Mundial
const getDaysToWorldCup = () => {
  const start = new Date("2026-06-11T00:00:00");
  const now = new Date();
  const diff = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const StatCard = ({ value, label, image, overlay }) => {
  return (
    <div
      className="rounded-xl text-white overflow-hidden relative"
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        minHeight: "200px",
      }}
    >
      {/* Overlay semitransparente */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: overlay, opacity: 0.65 }}
      />
      {/* Contenido centrado */}
      <div
        className="relative flex flex-col items-center justify-center h-full text-center"
        style={{ minHeight: "200px", padding: "1rem" }}
      >
        <div className="text-4xl font-bold drop-shadow-lg">{value ?? "—"}</div>
        <div className="text-xs font-semibold uppercase tracking-widest opacity-90 mt-2">{label}</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { matches, loading: matchesLoading } = useMatches();

  const [predictions, setPredictions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupsRanking, setGroupsRanking] = useState({});
  const [loading, setLoading] = useState(true);
  const daysLeft = getDaysToWorldCup();

  useEffect(() => {
    const load = async () => {
      try {
        const [predRes, groupsRes] = await Promise.all([
          getMyPredictions(),
          getMyGroups(),
        ]);
        setPredictions(predRes.data);
        const myGroups = groupsRes.data;
        setGroups(myGroups);

        // Cargar leaderboard de cada grupo para saber mi posición
        const rankingMap = {};
        await Promise.all(
          myGroups.slice(0, 3).map(async (g) => {
            try {
              const lb = await getGroupLeaderboard(g._id);
              const pos = lb.data?.findIndex(
                (e) => e.user?._id === user?._id || e.user?._id === user?.id
              );
              rankingMap[g._id] = {
                position: pos >= 0 ? pos + 1 : null,
                total: lb.data?.length || 0,
                points: lb.data?.[pos]?.totalPoints ?? 0,
              };
            } catch { rankingMap[g._id] = null; }
          })
        );
        setGroupsRanking(rankingMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Cargar widget script de api-football
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

  // Partidos NS sin pronosticar
  const predictedMatchIds = new Set(predictions.map((p) => String(p.matchId)));
  const unpredictedMatches = matches
    .filter((m) => m.fixture.status.short === "NS" && !predictedMatchIds.has(String(m.fixture.id)))
    .slice(0, 4);

  const totalPoints = user?.totalPoints ?? predictions.reduce((s, p) => s + (p.points || 0), 0);
  const predictedCount = predictions.length;
  const totalMatches = matches.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          minHeight: "210px",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,22,40,0.95) 40%, rgba(10,22,40,0.3) 100%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Hola, {user?.first_name} 👋
            </h1>
            <p className="text-green-300 text-sm mt-1">FIFA World Cup 2026</p>
            {daysLeft > 0 ? (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                <span className="text-yellow-300 font-bold text-lg">{daysLeft}</span>
                <span className="text-white text-xs">días para el inicio ⚽</span>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 bg-green-500/30 rounded-full px-3 py-1">
                <span className="text-green-300 font-bold text-sm">¡El Mundial ya empezó! 🎉</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={totalPoints}
          label="Mis puntos"
          image="/card-puntos.jpg"
          overlay="linear-gradient(135deg, #b45309, #92400e)"
        />
        <StatCard
          value={predictedCount}
          label="Pronósticos"
          image="/card-pronosticos.jpg"
          overlay="linear-gradient(135deg, #166534, #14532d)"
        />
        <StatCard
          value={totalMatches > 0 ? totalMatches - predictedCount : "—"}
          label="Sin pronosticar"
          image="/card-pendientes.jpg"
          overlay="linear-gradient(135deg, #1d4ed8, #1e3a8a)"
        />
        <StatCard
          value={groups.length}
          label="Grupos"
          image="/card-grupos.jpg"
          overlay="linear-gradient(135deg, #5b21b6, #3b0764)"
        />
      </div>

      {/* Partidos sin pronosticar */}
      {!matchesLoading && unpredictedMatches.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 className="font-football text-xl text-gray-800 flex items-center gap-2">
              🎯 Partidos sin pronosticar
            </h2>
            <button
              onClick={() => navigate("/fixtures")}
              className="text-xs text-green-600 hover:underline font-medium"
            >
              Ver todos →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unpredictedMatches.map((m) => (
              <div
                key={m.fixture.id}
                className="bg-card rounded-xl border border-orange-100 flex items-center justify-between"
                style={{ padding: "10px 16px", gap: "12px" }}
              >
                <div className="flex items-center min-w-0" style={{ gap: "12px" }}>
                  <img src={m.teams.home.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {m.teams.home.name} vs {m.teams.away.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(m.fixture.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      {" · "}
                      {new Date(m.fixture.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </p>
                  </div>
                  <img src={m.teams.away.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                </div>
                <button
                  onClick={() => navigate("/predictions/new", { state: { match: m } })}
                  style={{ padding: "5px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", background: "#16a34a", color: "#fff", flexShrink: 0 }}
                  className="hover:opacity-90 transition-opacity"
                >
                  Pronosticar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sin pronósticos hechos todavía */}
      {!loading && !matchesLoading && predictedCount === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-orange-700 font-medium text-sm">¡Todavía no hiciste ningún pronóstico!</p>
          <p className="text-orange-500 text-xs mt-1">Andá a Partidos y empezá a pronosticar antes que empiece el Mundial</p>
          <button
            onClick={() => navigate("/fixtures")}
            className="mt-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Ver partidos →
          </button>
        </div>
      )}

      {/* Mis grupos — ranking rápido */}
      {groups.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 className="font-football text-xl text-gray-800">👥 Mi posición en grupos</h2>
            <button onClick={() => navigate("/groups")} className="text-xs text-green-600 hover:underline font-medium">
              Ver todos →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.slice(0, 4).map((g) => {
              const rank = groupsRanking[g._id];
              return (
                <button
                  key={g._id}
                  onClick={() => navigate(`/groups/${g._id}`)}
                  className="bg-card rounded-xl border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all"
                  style={{ padding: "10px 16px" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800 truncate">{g.name}</p>
                    {g.roleInGroup === "owner" && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-2">Admin</span>
                    )}
                  </div>
                  {rank ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-bold text-green-600">#{rank.position}</span>
                      <p className="text-xs text-gray-400">de {rank.total} · {rank.points} pts</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Sin puntos aún</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Widget: partidos de hoy */}
      <section className="bg-card rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Partidos del Mundial — hoy
        </h2>
        <div
          id="wg-api-football-games"
          data-host="v3.football.api-sports.io"
          data-key={import.meta.env.VITE_FOOTBALL_API_KEY}
          data-league="1"
          data-season="2026"
          data-theme=""
          data-show-errors="false"
          data-show-logos="true"
          className="wg_loader"
        />
      </section>

    </div>
  );
};

export default Dashboard;
