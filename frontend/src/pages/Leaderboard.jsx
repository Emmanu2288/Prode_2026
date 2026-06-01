import { useEffect, useState } from "react";
import api from "../services/api";
import useAuthStore from "../store/authStore";

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    api.get("/users/leaderboard")
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myPosition = users.findIndex((u) => u._id === user?._id || u._id === user?.id) + 1;

  const medalColor = (i) => {
    if (i === 0) return "text-yellow-500";
    if (i === 1) return "text-gray-400";
    if (i === 2) return "text-orange-400";
    return "text-gray-400";
  };

  const medalIcon = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}`;
  };

  const rowBg = (i) => {
    if (i === 0) return "border-yellow-300 bg-yellow-50";
    if (i === 1) return "border-gray-300 bg-gray-50";
    if (i === 2) return "border-orange-200 bg-orange-50";
    return "border-gray-100 bg-white";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(234,179,8,0.2) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Global</h1>
            <p className="text-yellow-300 text-sm mt-1">{users.length} jugadores · FIFA World Cup 2026</p>
          </div>
          {myPosition > 0 && (
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold text-white">#{myPosition}</p>
              <p className="text-yellow-300 text-xs">tu posición</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {users.map((u, i) => {
          const isMe = u._id === user?._id || u._id === user?.id;
          return (
            <div
              key={u._id}
              className={`flex items-center gap-4 border rounded-xl px-4 py-3 transition-all ${rowBg(i)} ${isMe ? "ring-2 ring-green-400" : ""}`}
            >
              {/* Posición */}
              <span className={`text-lg font-bold w-8 text-center flex-shrink-0 ${medalColor(i)}`}>
                {medalIcon(i)}
              </span>

              {/* Avatar inicial */}
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {u.first_name} {u.last_name}
                  {isMe && <span className="text-green-600 text-xs ml-1 font-normal">(vos)</span>}
                </p>
              </div>

              {/* Puntos */}
              <span className={`text-lg font-bold flex-shrink-0 ${i < 3 ? medalColor(i) : "text-gray-600"}`}>
                {u.totalPoints ?? 0} <span className="text-xs font-normal text-gray-400">pts</span>
              </span>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <span className="text-4xl">🏆</span>
            <p className="mt-2 text-sm">Todavía no hay puntos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
