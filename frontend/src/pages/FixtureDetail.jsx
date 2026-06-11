import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useMatches from "../hooks/useMatches";
import { loadFootballWidgets } from "../utils/footballWidgets";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

const FixtureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, loading } = useMatches();
  const match = matches.find((m) => String(m.fixture.id) === String(id));

  useEffect(() => {
    loadFootballWidgets();
  }, []);

  const status = match?.fixture.status.short;
  const isLive = status && LIVE_STATUSES.has(status);
  const isFinished = status && FINISHED_STATUSES.has(status);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Volver a partidos
      </button>

      {loading ? (
        <p className="text-center text-xs text-gray-400 py-3">Cargando partido...</p>
      ) : match && (
        <div className="bg-card rounded-xl border border-gray-100 p-4">
          <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">
            {match.league.round}
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <img src={match.teams.home.logo} alt="" className="w-12 h-12 object-contain" />
              <p className="text-sm font-semibold text-gray-700 mt-2 text-center truncate w-full">{match.teams.home.name}</p>
            </div>
            <div className="flex-shrink-0 text-center px-2">
              {isLive || isFinished ? (
                <>
                  <p className="text-2xl font-bold text-gray-800">{match.goals.home} - {match.goals.away}</p>
                  <p className={`text-xs font-semibold mt-1 ${isLive ? "text-red-500" : "text-gray-400"}`}>
                    {isLive ? `⏱ ${match.fixture.status.elapsed}'` : "Finalizado"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-400">vs</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(match.fixture.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    {" · "}
                    {new Date(match.fixture.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <img src={match.teams.away.logo} alt="" className="w-12 h-12 object-contain" />
              <p className="text-sm font-semibold text-gray-700 mt-2 text-center truncate w-full">{match.teams.away.name}</p>
            </div>
          </div>
          {match.fixture.venue?.name && (
            <p className="text-center text-xs text-gray-400 mt-3">
              📍 {match.fixture.venue.name}{match.fixture.venue.city ? `, ${match.fixture.venue.city}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-gray-100 p-4">
        <div
          id="wg-api-football-game"
          data-host="v3.football.api-sports.io"
          data-key={import.meta.env.VITE_FOOTBALL_API_KEY}
          data-id={id}
          data-theme=""
          data-show-errors="false"
          data-show-logos="true"
          className="wg_loader"
        />
      </div>
    </div>
  );
};

export default FixtureDetail;
