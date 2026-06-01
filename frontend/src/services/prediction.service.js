import api from "./api";

export const createPrediction = (data) => api.post("/predictions", data);
export const updatePrediction = (matchId, data) => api.put(`/predictions/match/${matchId}`, data);
export const getMyPredictions = () => api.get("/predictions/me");
export const getExtras        = ()     => api.get("/predictions/extras");
export const saveExtras       = (data) => api.post("/predictions/extras", data);
