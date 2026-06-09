import api from './api';

// Genera un pase de Google Wallet (snapshot) para el perro y devuelve { saveUrl }.
export const generateWalletPass = (dogId) =>
  api.post(`/dogs/${dogId}/wallet-pass`);
