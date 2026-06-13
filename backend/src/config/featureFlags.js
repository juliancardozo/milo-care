'use strict';

module.exports = {
  reminderFullListEnabled: process.env.REMINDER_FULL_LIST_ENABLED !== 'false',
  // Pases de Google Wallet para perfiles de perros. Apagado por defecto: requiere
  // credenciales de Issuer + service account (ver GOOGLE_WALLET_* en .env.example).
  googleWalletEnabled: process.env.GOOGLE_WALLET_ENABLED === 'true',
  // Check-in diario "¿Cómo está [perro] hoy?". Apagado por defecto en producción
  // hasta validar el flujo completo (email + respuesta one-click + tendencias).
  checkinEnabled: process.env.CHECKIN_ENABLED === 'true',
  // Notificaciones push (Web Push / VAPID). Requiere VAPID_PUBLIC_KEY y
  // VAPID_PRIVATE_KEY; si faltan, el servicio queda inactivo aunque el flag esté on.
  pushEnabled: process.env.PUSH_ENABLED === 'true',
  // Multi-tutor: acceso compartido y con roles a un perfil de perro.
  // Apagado por defecto; activar cuando DogAccess backfill esté completo.
  multiTutorEnabled: process.env.MULTI_TUTOR_ENABLED === 'true',
};
