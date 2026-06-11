import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadFootballWidgets } from "../utils/footballWidgets";

const FixtureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadFootballWidgets();
  }, []);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Volver a partidos
      </button>

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
