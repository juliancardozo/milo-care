'use strict';

module.exports = {
  reminderFullListEnabled: process.env.REMINDER_FULL_LIST_ENABLED !== 'false',
  // Pases de Google Wallet para perfiles de perros. Apagado por defecto: requiere
  // credenciales de Issuer + service account (ver GOOGLE_WALLET_* en .env.example).
  googleWalletEnabled: process.env.GOOGLE_WALLET_ENABLED === 'true',
};
