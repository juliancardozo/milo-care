import api from './api';

// Check-in diario "¿Cómo está [perro] hoy?"

export const getCheckinToday = (dogId) => api.get(`/dogs/${dogId}/checkins/today`);
export const postCheckin = (dogId, data) => api.post(`/dogs/${dogId}/checkins`, data);
export const getCheckinTrends = (dogId) => api.get(`/dogs/${dogId}/checkins/trends`);
export const getCheckinStreak = (dogId) => api.get(`/dogs/${dogId}/checkins/streak`);
export const getCheckinHistory = (dogId, params) =>
  api.get(`/dogs/${dogId}/checkins`, { params });
