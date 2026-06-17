import api from "./api";

export const getMatches = (params = {}) => api.get("/matches", { params });
export const getFixturePlayers = (fixtureId) => api.get(`/matches/${fixtureId}/players`);
export const getHeadToHead = (team1, team2) => api.get("/matches/h2h", { params: { team1, team2 } });
export const getFixtureEvents = (fixtureId) => api.get(`/matches/${fixtureId}/events`);
export const getStandings = () => api.get("/matches/standings");
export const getGoldenBoyCandidates = () => api.get("/matches/golden-boy-candidates");
export const getFairPlayStats = () => api.get("/matches/fair-play");
