import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "P"];

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

const getCountdown = (dateStr) => {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 1)  return `Cierra en ${days}d`;
  if (days === 1) return `Cierra mañana`;
  if (hours > 0) return `⚠️ Cierra en ${hours}h ${mins}m`;
  return `⚠️ Cierra en ${mins}m`;
};

const MatchCard = ({ match }) => {
  const navigate = useNavigate();
  const { fixture, teams, goals } = match;
  const status = fixture.status.short;
  const isLive = LIVE_STATUSES.includes(status);
  const isFinished = ["FT", "AET", "PEN"].includes(status);
  const isNotStarted = status === "NS";

  return (
    <div className={`bg-white rounded-xl border ${isLive ? "border-red-300 shadow-md" : "border-gray-100"} p-4 hover:shadow-md transition-shadow`}>
      {/* Fecha, estado y countdown */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-gray-400">
            {formatDate(fixture.date)} · {formatTime(fixture.date)}
          </span>
          {isNotStarted && (() => {
            const cd = getCountdown(fixture.date);
            if (!cd) return null;
            const isUrgent = cd.startsWith("⚠️");
            return (
              <span className={`ml-2 text-xs font-semibold ${isUrgent ? "text-orange-500" : "text-gray-400"}`}>
                · {cd}
              </span>
            );
          })()}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Equipos y marcador */}
      <div className="flex items-center justify-between gap-2">
        {/* Local */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <img
            src={teams.home.logo}
            alt={teams.home.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.src = "/placeholder-team.png"; }}
          />
          <span className="text-xs font-medium text-gray-700 text-center leading-tight">
            {teams.home.name}
          </span>
        </div>

        {/* Marcador / VS */}
        <div className="flex flex-col items-center min-w-[60px]">
          {isFinished || isLive ? (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${teams.home.winner ? "text-green-600" : "text-gray-800"}`}>
                {goals.home ?? 0}
              </span>
              <span className="text-gray-300 font-light">—</span>
              <span className={`text-2xl font-bold ${teams.away.winner ? "text-green-600" : "text-gray-800"}`}>
                {goals.away ?? 0}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-gray-400">VS</span>
          )}
          {isLive && fixture.status.elapsed && (
            <span className="text-xs text-red-500 font-medium mt-0.5">
              {fixture.status.elapsed}'
            </span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <img
            src={teams.away.logo}
            alt={teams.away.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.src = "/placeholder-team.png"; }}
          />
          <span className="text-xs font-medium text-gray-700 text-center leading-tight">
            {teams.away.name}
          </span>
        </div>
      </div>

      {/* Estadio */}
      {fixture.venue.name && (
        <p className="text-xs text-gray-400 text-center mt-2">
          📍 {fixture.venue.name}, {fixture.venue.city}
        </p>
      )}

      {/* MVP del partido (real, visible para todos) */}
      {isFinished && match.mvp && (
        <div className="text-center mt-2">
          <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            ⭐ MVP: {match.mvp}
          </span>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2 mt-3">
        {isNotStarted && (
          <button
            onClick={() => navigate(`/predictions/new`, { state: { match } })}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            ⚽ Pronosticar
          </button>
        )}
        <button
          onClick={() => navigate(`/fixtures/${fixture.id}`)}
          className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium py-2 rounded-lg transition-colors"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
