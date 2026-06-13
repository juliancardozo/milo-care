import api from './api';

// Programa de referidos (Fase 4)

export const getMyReferrals = () => api.get('/referrals/me');
export const markReferralShared = (channel) => api.post('/referrals/shared', { channel });

// Recompensa sorpresa tras el check-in
export const rollSurprise = (dogId) => api.get(`/dogs/${dogId}/surprise`);

// ── localStorage del código entrante (?ref=CODE) ─────────────────────────────
const REF_KEY = 'milocare.ref';

export function captureRefFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
  } catch {
    // noop
  }
}

export function getStoredRef() {
  try {
    return localStorage.getItem(REF_KEY) || null;
  } catch {
    return null;
  }
}

export function clearStoredRef() {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    // noop
  }
}
