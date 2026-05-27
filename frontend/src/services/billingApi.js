import api from './api';

export const startCheckout = (returnUrl) =>
  api.post('/billing/checkout', { returnUrl });

export const getSubscriptionStatus = () =>
  api.get('/billing/subscription');

export const syncSubscription = () =>
  api.post('/billing/subscription/sync');

export const cancelSubscription = () =>
  api.delete('/billing/subscription');
