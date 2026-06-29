import { useState } from "react";
import { getSlotLabel } from "../../utils/bracketUtils";

const ROUNDS = [
  { key: "Round of 32", label: "16vos" },
  { key: "Round of 16", label: "8vos" },
  { key: "Quarter-finals", label: "4tos" },
  { key: "Semi-finals", label: "Semis" },
  { key: "Final", label: "Final" },
];
const FINISHED = new Set(["FT", "AET", "PEN"]);

const MatchupCard = ({ m }) => {
  const labelA = getSlotLabel(m.teamA, m.leftSource);
  const labelB = getSlotLabel(m.teamB, m.rightSource);
  const isFinished = m.fixture && FINISHED.has(m.fixture.fixture.status.short);

  if (!labelA || !labelB) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-center text-sm text-gray-400">
        Por definir
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm truncate flex-1 ${m.winner === labelA ? "font-semibold text-gray-800" : "text-gray-400"}`}>
          {labelA}
        </span>
        {isFinished && (
          <span className="text-sm font-bold text-gray-700 flex-shrink-0">{m.fixture.goals.home}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={`text-sm truncate flex-1 ${m.winner === labelB ? "font-semibold text-gray-800" : "text-gray-400"}`}>
          {labelB}
        </span>
        {isFinished && (
          <span className="text-sm font-bold text-gray-700 flex-shrink-0">{m.fixture.goals.away}</span>
        )}
      </div>
      {m.fixture && !isFinished && (
        <p className="text-xs text-gray-400 mt-1.5">
          {new Date(m.fixture.fixture.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
          {" · "}
          {new Date(m.fixture.fixture.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </p>
      )}
    </div>
  );
};

const BracketMobile = ({ rounds }) => {
  const [selected, setSelected] = useState("Round of 32");
  const matchups = rounds[selected] || [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {ROUNDS.map((r) => (
          <button
            key={r.key}
            onClick={() => setSelected(r.key)}
            className={`whitespace-nowrap rounded-full font-semibold transition-colors flex-shrink-0 text-xs px-4 py-2 ${
              selected === r.key
                ? "bg-green-600 text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {matchups.map((m, i) => (
          <MatchupCard key={i} m={m} />
        ))}
      </div>
    </div>
  );
};

export default BracketMobile;
