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
  // Capa B2B2C "Companion" (multi-tenant / white-label / partners). Apagado por
  // defecto: gatea las rutas de partners. Lo B2C existente no depende de este flag.
  companionEnabled: process.env.COMPANION_ENABLED === 'true',
  // Sello de verificación veterinaria sobre el Health Score (atestaciones discretas
  // → niveles self/verified/certified). Encendido por defecto: es B2C, benigno y
  // aditivo (no cambia el número del score, solo agrega metadata de confianza).
  vetSealEnabled: process.env.VET_SEAL_ENABLED !== 'false',
};
