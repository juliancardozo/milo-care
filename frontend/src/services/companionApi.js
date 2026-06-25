import api from './api';

// Companion de seguro (B2B2C) — póliza, cobertura, reclamos, lead.
export const getPolicy = (dogId) => api.get(`/dogs/${dogId}/policy`);
export const savePolicy = (dogId, payload) => api.post(`/dogs/${dogId}/policy`, payload);
export const checkCoverage = (dogId, event) => api.get(`/dogs/${dogId}/policy/coverage-check`, { params: { event } });

export const createClaim = (dogId, payload) => api.post(`/dogs/${dogId}/claims`, payload);
export const getClaims = (dogId) => api.get(`/dogs/${dogId}/claims`);
export const getClaim = (id) => api.get(`/claims/${id}`);

export const createInsuranceLead = (dogId, payload) => api.post(`/dogs/${dogId}/insurance-lead`, payload);

// Checkout B2C de Premium (Mercado Pago). 503 si no está configurado.
export const startPremiumCheckout = () => api.post('/billing/checkout');
