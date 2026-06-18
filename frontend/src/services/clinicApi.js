import api from './api';

// Kit de Activación Veterinaria — atribución por QR/link + panel del vet.

// ── localStorage de la clínica entrante (/c/:slug) ───────────────────────────
const CLINIC_KEY = 'milocare.clinic';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // ventana de atribución: 7 días

export function storeClinic(slug, src) {
  try {
    if (!slug) return;
    localStorage.setItem(CLINIC_KEY, JSON.stringify({ slug, src: src || 'link', ts: Date.now() }));
  } catch { /* noop */ }
}

// Lee la query (?c=slug&src=qr) y la persiste. Usado en la landing /c/:slug y en App.
export function captureClinicFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('c');
    if (slug) storeClinic(slug.trim().toLowerCase(), params.get('src'));
  } catch { /* noop */ }
}

// Devuelve { slug, src, ts } sólo si la captura sigue dentro de la ventana de 7 días.
export function getStoredClinic() {
  try {
    const raw = localStorage.getItem(CLINIC_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.slug || !data?.ts || Date.now() - data.ts > WINDOW_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearStoredClinic() {
  try { localStorage.removeItem(CLINIC_KEY); } catch { /* noop */ }
}

// ── Endpoints ────────────────────────────────────────────────────────────────
export const getPublicClinic = (slug) => api.get(`/public/clinics/${slug}`);

// Vet (autoservicio, secundario) + panel
export const vetPortalRegister = (payload) => api.post('/vet-portal/register', payload);
export const getVetPanel = () => api.get('/vet-portal/panel');

// Admin/adminVet — gestión de clínicas
export const adminListClinics = () => api.get('/admin/clinics');
export const adminCreateClinic = (payload) => api.post('/admin/clinics', payload);
export const adminGetClinicPanel = (id) => api.get(`/admin/clinics/${id}/panel`);
