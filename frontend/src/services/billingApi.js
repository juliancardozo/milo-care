import api from './api';

// Registra el interés del usuario en Premium (avisa al admin + confirma al usuario).
export const requestPremiumInterest = () =>
  api.post('/billing/interest');

export const getSubscriptionStatus = () =>
  api.get('/billing/subscription');
