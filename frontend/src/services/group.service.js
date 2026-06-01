import api from "./api";

export const getMyGroups       = ()              => api.get("/groups/my");
export const getGroupById      = (id)            => api.get(`/groups/${id}`);
export const createGroup       = (data)          => api.post("/groups", data);
export const getGroupMembers   = (id)            => api.get(`/groups/${id}/members`);
export const getGroupLeaderboard = (id)          => api.get(`/groups/${id}/leaderboard`);
export const inviteToGroup     = (id, data)      => api.post(`/groups/${id}/invite`, data);

export const searchUsers           = (q)          => api.get(`/users/search?q=${encodeURIComponent(q)}`);
export const getGroupPredictions   = (id)        => api.get(`/groups/${id}/predictions`);
export const deleteGroup           = (id)        => api.delete(`/groups/${id}`);
export const getPendingInvitations = ()          => api.get("/invitations/pending");
export const acceptInvitation  = (token)         => api.post("/invitations/accept", { token });
export const rejectInvitation  = (token)         => api.post(`/invitations/${token}/reject`);
