import api from "./api";

export const getMatches = (params = {}) => api.get("/matches", { params });
export const getFixturePlayers = (fixtureId) => api.get(`/matches/${fixtureId}/players`);
