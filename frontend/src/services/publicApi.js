import api from './api';

// Ficha pública de una mascota (sin login). La usa la página que abre el QR del pase.
export const getPublicDog = (dogId) =>
  api.get(`/public/dogs/${dogId}`);
