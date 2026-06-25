import api from './api';

/**
 * Resuelve el branding white-label de un partner por slug. Endpoint público:
 * 404 si no existe o está pausado → el caller cae al branding Milo Care default.
 */
export const getPartnerTheme = (slug) =>
  api.get(`/public/partners/by-slug/${encodeURIComponent(slug)}/theme`);

/** Comparte el resumen de salud del perro por WhatsApp (devuelve { text, link }). */
export const shareDogWhatsapp = (dogId, payload = {}) =>
  api.post(`/dogs/${dogId}/share/whatsapp`, payload);

/** URL del carnet PDF generado en backend (gated por entitlement). */
export const dogExportPdfUrl = (dogId) => `/api/dogs/${dogId}/export.pdf`;
