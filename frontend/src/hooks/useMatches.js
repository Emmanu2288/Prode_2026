import { useState, useEffect } from "react";
import { getMatches } from "../services/match.service";

const useMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMatches();
        setMatches(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar los partidos");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Rounds únicos en orden
  const rounds = [...new Set(matches.map((m) => m.league.round))];

  // Agrupar por round
  const groupedByRound = rounds.reduce((acc, round) => {
    acc[round] = matches.filter((m) => m.league.round === round);
    return acc;
  }, {});

  // Round más próximo con partidos NS (Not Started)
  const nextRound = rounds.find((r) =>
    groupedByRound[r].some((m) => m.fixture.status.short === "NS")
  );

  return { matches, groupedByRound, rounds, nextRound, loading, error };
};

export default useMatches;
