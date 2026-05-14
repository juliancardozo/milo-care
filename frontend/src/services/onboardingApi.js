import api from './api';

export const startOnboarding = (owner = {}) => api.post('/onboarding/start', { owner });
export const saveOnboardingStep = (sessionId, stepKey, payload) => api.post(`/onboarding/${sessionId}/${stepKey}`, payload);
export const getOnboardingDraft = (sessionId) => api.get(`/onboarding/${sessionId}/draft`);
export const getOnboardingSummary = (sessionId) => api.get(`/onboarding/${sessionId}/summary`);
export const confirmOnboarding = (sessionId, payload) => api.post(`/onboarding/${sessionId}/confirm`, payload);

export default {
  startOnboarding,
  saveOnboardingStep,
  getOnboardingDraft,
  getOnboardingSummary,
  confirmOnboarding,
};
