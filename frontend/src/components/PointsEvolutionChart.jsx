import { useState, useMemo } from "react";

const MEDAL_COLOR = ["#f59e0b", "#94a3b8", "#c97c3a"];

const PointsEvolutionChart = ({ data, loading }) => {
  // Infinity se clampea al último índice disponible → muestra el partido más reciente por defecto
  const [matchIdx, setMatchIdx] = useState(Infinity);

  const lastIdx = data?.matches?.length ? data.matches.length - 1 : 0;
  const effectiveIdx = Math.min(matchIdx, lastIdx);

  const rankingAtIdx = useMemo(() => {
    if (!data?.series?.length) return [];
    return data.series
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        points: s.cumulative[effectiveIdx] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [data, effectiveIdx]);

  const prevRankMap = useMemo(() => {
    if (!data?.series?.length || effectiveIdx === 0) return null;
    const prev = data.series
      .map((s) => ({
        userId: s.userId,
        points: s.cumulative[effectiveIdx - 1] ?? 0,
      }))
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));
    return new Map(prev.map((u) => [u.userId, u.rank]));
  }, [data, effectiveIdx]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 mt-3">
        <p className="text-xs text-center text-gray-400 py-8">Cargando evolución...</p>
      </div>
    );
  }

  if (!data?.matches?.length || data.matches.length < 2) return null;

  const { matches } = data;
  const currentLabel = matches[effectiveIdx]?.label ?? `P${effectiveIdx + 1}`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          📊 Ranking histórico
        </h3>
        <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
          {currentLabel}
        </span>
      </div>

      {/* Slider */}
      <div className="mb-4 px-0.5">
        <input
          type="range"
          min={0}
          max={lastIdx}
          value={effectiveIdx}
          onChange={(e) => setMatchIdx(+e.target.value)}
          className="w-full cursor-pointer"
          style={{ accentColor: "#16a34a" }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1 select-none">
          <span>{matches[0].label}</span>
          <span className="text-gray-400 italic">arrastrá para ver el historial</span>
          <span>{matches[matches.length - 1].label}</span>
        </div>
      </div>

      {/* Lista de ranking */}
      <div className="space-y-1.5">
        {rankingAtIdx.map((user) => {
          const prevRank = prevRankMap?.get(user.userId);
          const rankDiff = prevRank != null ? prevRank - user.rank : 0;
          const medal = MEDAL_COLOR[user.rank - 1] ?? null;

          return (
            <div
              key={user.userId}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: medal ? `${medal}18` : "#f9fafb" }}
            >
              {/* Badge posición */}
              <span
                className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  minWidth: "1.5rem",
                  background: medal ?? "#e5e7eb",
                  color: medal ? "#fff" : "#6b7280",
                }}
              >
                {user.rank}
              </span>

              {/* Nombre */}
              <span className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">
                {user.name}
              </span>

              {/* Movimiento de posición */}
              <span
                className="text-xs font-bold flex-shrink-0 text-right"
                style={{
                  minWidth: "2rem",
                  color:
                    rankDiff > 0 ? "#16a34a" : rankDiff < 0 ? "#ef4444" : "#d1d5db",
                }}
              >
                {effectiveIdx === 0 || rankDiff === 0
                  ? "—"
                  : rankDiff > 0
                  ? `▲${rankDiff}`
                  : `▼${Math.abs(rankDiff)}`}
              </span>

              {/* Puntos */}
              <span
                className="text-sm font-bold text-gray-700 flex-shrink-0 text-right"
                style={{ minWidth: "3.5rem" }}
              >
                {user.points} pts
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PointsEvolutionChart;
