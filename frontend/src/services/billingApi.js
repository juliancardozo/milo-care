import api from './api';

// Registra el interés del usuario en Premium (avisa al admin + confirma al usuario).
export const requestPremiumInterest = () =>
  api.post('/billing/interest');

export const getSubscriptionStatus = () =>
  api.get('/billing/subscription');

// Cancela la suscripción recurrente (Merchant of Record). El usuario conserva Premium
// hasta el final del período ya pago.
export const cancelSubscription = () =>
  api.post('/billing/cancel');
