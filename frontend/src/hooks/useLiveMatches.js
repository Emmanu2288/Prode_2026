import { useState, useEffect } from "react";
import useSocket from "./useSocket";

/**
 * Recibe el array inicial de matches y lo actualiza en tiempo real
 * escuchando eventos Socket.IO del servidor.
 */
const useLiveMatches = (initialMatches) => {
  const [matches, setMatches] = useState(initialMatches);
  const [prevInitialMatches, setPrevInitialMatches] = useState(initialMatches);
  const socket = useSocket();

  // Sincronizar cuando cambia la fuente
  if (initialMatches !== prevInitialMatches) {
    setPrevInitialMatches(initialMatches);
    setMatches(initialMatches);
  }

  useEffect(() => {
    if (!socket) return;

    // Partido finalizado → actualizar marcador y status
    const onFinished = ({ matchId, finalGoals }) => {
      setMatches((prev) =>
        prev.map((m) =>
          String(m.fixture.id) === String(matchId)
            ? {
                ...m,
                goals: { home: finalGoals.home, away: finalGoals.away },
                fixture: { ...m.fixture, status: { short: "FT", long: "Match Finished", elapsed: 90 } },
              }
            : m
        )
      );
    };

    // Evento en vivo (gol, tarjeta) → actualizar elapsed y marcador si hay goles
    const onEvent = ({ matchId, fixture }) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (String(m.fixture.id) !== String(matchId)) return m;
          const updated = { ...m, fixture: { ...m.fixture } };
          if (fixture?.goals) updated.goals = fixture.goals;
          if (fixture?.fixture?.status) updated.fixture.status = fixture.fixture.status;
          return updated;
        })
      );
    };

    socket.on("match_finished", onFinished);
    socket.on("match_event", onEvent);

    return () => {
      socket.off("match_finished", onFinished);
      socket.off("match_event", onEvent);
    };
  }, [socket]);

  return matches;
};

export default useLiveMatches;
