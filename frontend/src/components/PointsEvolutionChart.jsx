import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
  "#84cc16", "#06b6d4",
];

const PointsEvolutionChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 mt-3">
        <p className="text-xs text-center text-gray-400 py-8">Cargando evolución...</p>
      </div>
    );
  }

  if (!data?.matches?.length || data.matches.length < 2) return null;

  const { matches, series } = data;

  const chartData = matches.map((m, i) => {
    const point = { name: m.label };
    for (const s of series) {
      point[s.name] = s.cumulative[i];
    }
    return point;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
        📈 Evolución de puntos
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "6px 10px" }}
            formatter={(value, name) => [`${value} pts`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {series.map((s, i) => (
            <Line
              key={s.userId}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PointsEvolutionChart;
