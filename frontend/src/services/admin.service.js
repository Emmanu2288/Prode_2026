import api from "./api";

export const getAdminUsers          = ()     => api.get("/admin/users");
export const getAdminGroups         = ()     => api.get("/admin/groups");
export const getTournamentData      = ()     => api.get("/admin/tournament-data");
export const processTournamentAwards = (data) => api.post("/admin/tournament-awards", data);
export const getFinishedMatches     = ()     => api.get("/admin/finished-matches");
export const setManualMvp           = (fixtureId, data) => api.post(`/admin/mvp/${fixtureId}`, data);
export const generateResetLink      = (userId) => api.post(`/admin/users/${userId}/reset-link`);
export const sendAnnouncement       = (data)   => api.post("/admin/announce", data);
