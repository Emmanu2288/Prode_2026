import api from "./api";

export const getMatches = (params = {}) => api.get("/matches", { params });
export const getFixturePlayers = (fixtureId) => api.get(`/matches/${fixtureId}/players`);
export const getHeadToHead = (team1, team2) => api.get("/matches/h2h", { params: { team1, team2 } });
