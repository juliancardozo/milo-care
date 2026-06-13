import api from './api';

// Hitos compartibles (Fase 3)

export const getMilestones = (dogId) => api.get(`/dogs/${dogId}/milestones`);
export const markMilestoneSeen = (dogId, key) => api.post(`/dogs/${dogId}/milestones/${key}/seen`);
export const markMilestoneShare = (dogId, key, action) =>
  api.post(`/dogs/${dogId}/milestones/${key}/share`, { action });
