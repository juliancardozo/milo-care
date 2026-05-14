import api from './api';

export const getDogCalendar = (dogId, params) => api.get(`/dogs/${dogId}/calendar`, { params });
export const getDogCalendarSummary = (dogId) => api.get(`/dogs/${dogId}/summary`);
export const updateCalendarEventStatus = (eventId, payload) => api.patch(`/events/${eventId}/status`, payload);

export default {
  getDogCalendar,
  getDogCalendarSummary,
  updateCalendarEventStatus,
};
