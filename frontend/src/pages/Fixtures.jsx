import { useState, useEffect } from "react";
import useMatches from "../hooks/useMatches";
import useLiveMatches from "../hooks/useLiveMatches";
import MatchCard from "../components/fixtures/MatchCard";
import RoundFilter from "../components/fixtures/RoundFilter";

const Fixtures = () => {
  const { matches: initialMatches, groupedByRound: initialGrouped, rounds, nextRound, loading, error } = useMatches();
  const liveMatches = useLiveMatches(initialMatches);

  // Reagrupar con datos live
  const groupedByRound = rounds.reduce((acc, round) => {
    acc[round] = liveMatches.filter((m) => m.league.round === round);
    return acc;
  }, {});
  const [selectedRound, setSelectedRound] = useState(null);

  // Selecciona automáticamente el round más próximo al cargar
  useEffect(() => {
    if (nextRound && !selectedRound) {
      setSelectedRound(nextRound);
    } else if (rounds.length > 0 && !selectedRound) {
      setSelectedRound(rounds[0]);
    }
  }, [nextRound, rounds, selectedRound]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">⚽</div>
          <p className="text-gray-500 text-sm">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Error al cargar los partidos</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const currentMatches = selectedRound ? groupedByRound[selectedRound] || [] : [];

  return (
    <div className="space-y-5">
      {/* Hero banner — fondo oscuro tipo estadio */}
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Partidos</h1>
            <p className="text-green-300 text-sm mt-1">
              FIFA World Cup 2026 · {rounds.length} fechas · {Object.values(groupedByRound).flat().length} partidos
            </p>
          </div>
        </div>
      </div>

      {/* Filtro por fecha/round */}
      <RoundFilter
        rounds={rounds}
        selected={selectedRound}
        onChange={setSelectedRound}
      />

      {/* Título del round seleccionado */}
      {selectedRound && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">
            {selectedRound.replace("Group Stage - ", "Fase de grupos · Fecha ")}
          </h2>
          <span className="text-xs text-gray-400">
            {currentMatches.length} partido{currentMatches.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Grilla de partidos */}
      {currentMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentMatches.map((match) => (
            <MatchCard key={match.fixture.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl">📅</span>
          <p className="mt-2 text-sm">No hay partidos en esta fecha</p>
        </div>
      )}
    </div>
  );
};

export default Fixtures;
