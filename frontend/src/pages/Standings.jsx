import { useState, useEffect } from "react";
import { getStandings, getGoldenBoyCandidates } from "../services/match.service";
import BallIcon from "../components/BallIcon";

const formBadgeColor = (r) => {
  if (r === "W") return "bg-green-500 text-white";
  if (r === "D") return "bg-gray-300 text-gray-700";
  if (r === "L") return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-400";
};

const TopScorers = ({ players }) => {
  if (!players?.length) return null;
  return (
    <section className="bg-card rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
        👟 Goleadores
      </h2>
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3" style={{ padding: "6px 0" }}>
            <span className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</span>
            <img
              src={p.photo}
              alt={p.name}
              className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0"
              onError={(e) => { e.target.style.visibility = "hidden"; }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
              <div className="flex items-center gap-1.5">
                {p.teamLogo && <img src={p.teamLogo} alt="" className="w-4 h-4 object-contain" />}
                <p className="text-xs text-gray-400 truncate">{p.team}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-green-600">{p.goals}</p>
              <p className="text-xs text-gray-400">goles</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const GoldenBoyCandidates = ({ candidates, loading }) => {
  if (loading || !candidates?.length) return null;
  return (
    <section className="bg-card rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
        🌱 Candidatos a Mejor Jugador Joven (Sub-21)
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Te puede ayudar a elegir tu pronóstico de "Golden Boy" en Extras: goles, asistencias, veces figura del partido, intercepciones y duelos ganados.
      </p>
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3" style={{ padding: "6px 0" }}>
            <img
              src={c.photo}
              alt={c.name}
              className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0"
              onError={(e) => { e.target.style.visibility = "hidden"; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                <span className="text-xs text-gray-400 flex-shrink-0">{c.age} años</span>
              </div>
              <div className="flex items-center gap-1.5">
                {c.teamLogo && <img src={c.teamLogo} alt="" className="w-4 h-4 object-contain" />}
                <p className="text-xs text-gray-400 truncate">{c.team}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600 flex-shrink-0 justify-end" style={{ maxWidth: "130px" }}>
              <span title="Goles">⚽ {c.goals}</span>
              <span title="Asistencias">🅰️ {c.assists}</span>
              <span title="Veces figura del partido">🌟 {c.mvpCount}</span>
              <span title="Intercepciones">🛡️ {c.interceptions ?? "-"}</span>
              <span title="Duelos ganados">🤼 {c.duelsWon ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const GroupTable = ({ group, teams }) => (
  <section className="bg-card rounded-xl border border-gray-100 overflow-hidden">
    <h2 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
      {group}
    </h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: "480px" }}>
        <thead>
          <tr className="text-xs text-gray-400 uppercase">
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Equipo</th>
            <th className="px-2 py-2">PJ</th>
            <th className="px-2 py-2">G</th>
            <th className="px-2 py-2">E</th>
            <th className="px-2 py-2">P</th>
            <th className="px-2 py-2">GF</th>
            <th className="px-2 py-2">GC</th>
            <th className="px-2 py-2">DG</th>
            <th className="px-2 py-2">Pts</th>
            <th className="px-3 py-2">Forma</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.team.id} className={`border-t border-gray-50 ${t.rank <= 2 ? "bg-green-50/60" : ""}`}>
              <td className="px-3 py-2 font-semibold text-gray-600">{t.rank}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={t.team.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  <span className="font-medium text-gray-800 truncate">{t.team.name}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.played ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.win ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.draw ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.lose ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.goals?.for ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.all?.goals?.against ?? 0}</td>
              <td className="px-2 py-2 text-center text-gray-600">{t.goalsDiff ?? 0}</td>
              <td className="px-2 py-2 text-center font-bold text-gray-800">{t.points ?? 0}</td>
              <td className="px-3 py-2">
                <div className="flex gap-0.5 justify-center">
                  {(t.form || "").split("").map((r, i) => (
                    <span key={i} className={`w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center ${formBadgeColor(r)}`}>
                      {r}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-50">
      🟢 Clasifican directo los 2 primeros · los mejores terceros completan los octavos
    </p>
  </section>
);

const Standings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goldenBoy, setGoldenBoy] = useState([]);
  const [loadingGoldenBoy, setLoadingGoldenBoy] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getStandings();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar la tabla de posiciones");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    getGoldenBoyCandidates()
      .then((res) => setGoldenBoy(res.data))
      .catch(() => setGoldenBoy([]))
      .finally(() => setLoadingGoldenBoy(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BallIcon className="w-9 h-9 mb-3 animate-bounce" />
          <p className="text-gray-500 text-sm">Cargando tabla de posiciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Error al cargar la tabla</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { standings = [], topScorers = [] } = data || {};

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          minHeight: "210px",
        }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tabla de posiciones</h1>
            <p className="text-green-300 text-sm mt-1">FIFA World Cup 2026 · Fase de grupos</p>
          </div>
        </div>
      </div>

      <TopScorers players={topScorers} />

      <GoldenBoyCandidates candidates={goldenBoy} loading={loadingGoldenBoy} />

      {standings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl">📊</span>
          <p className="mt-2 text-sm">La tabla todavía no está disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {standings.map((teams, idx) => (
            <GroupTable
              key={teams[0]?.group ?? idx}
              group={(teams[0]?.group || "").replace("Group Stage - ", "")}
              teams={teams}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Standings;
