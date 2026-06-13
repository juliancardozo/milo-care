import api from './api';

export const getVapidKey = () => api.get('/push/vapid-key');
export const subscribePush = (subscription) => api.post('/push/subscribe', { subscription });
export const unsubscribePush = (endpoint) => api.post('/push/unsubscribe', { endpoint });
export const sendTestPush = () => api.post('/push/test');
