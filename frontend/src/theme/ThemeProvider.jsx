import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getPartnerTheme } from '../services/partnerApi';
import { partnerLoading, partnerResolved, partnerDefault } from '../store/partnerSlice';

// Etiquetas de host que NO son slugs de partner (apex / entornos propios).
const RESERVED_HOSTS = ['www', 'app', 'localhost', 'milocare', 'milocura', '127'];

/**
 * Resuelve el slug del partner desde:
 *   1) ?partner=<slug>   (override de desarrollo / QA)
 *   2) subdominio         (acme.milocare.online → "acme")
 * Sin slug → branding Milo Care default.
 */
export function resolvePartnerSlug(loc = window.location) {
  const fromQuery = new URLSearchParams(loc.search).get('partner');
  if (fromQuery) return fromQuery.toLowerCase().trim();

  const parts = (loc.hostname || '').split('.');
  if (parts.length >= 3 && !RESERVED_HOSTS.includes(parts[0])) {
    return parts[0].toLowerCase();
  }
  return null;
}

// Aplica el branding del partner como CSS variables sobre :root. Sin valores →
// no toca nada (quedan los defaults de index.css = Milo Care).
function applyBranding(branding) {
  const root = document.documentElement;
  if (branding.primaryColor) {
    root.style.setProperty('--color-primary', branding.primaryColor);
    root.style.setProperty('--color-primary-dark', branding.secondaryColor || branding.primaryColor);
  }
  if (branding.secondaryColor) {
    root.style.setProperty('--color-secondary', branding.secondaryColor);
  }
  if (branding.appName) document.title = branding.appName;
}

/**
 * Resuelve el partner por slug al montar y aplica el branding white-label.
 * Es no-bloqueante: renderiza children inmediatamente; el theming se aplica
 * cuando la respuesta llega (sin partner → no cambia nada).
 */
export default function ThemeProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const slug = resolvePartnerSlug();
    if (!slug) {
      dispatch(partnerDefault());
      return;
    }

    let cancelled = false;
    dispatch(partnerLoading(slug));

    getPartnerTheme(slug)
      .then((res) => {
        if (cancelled) return;
        const { branding, type } = res.data || {};
        dispatch(partnerResolved({ slug, type, branding }));
        applyBranding(branding || {});
      })
      .catch(() => {
        if (!cancelled) dispatch(partnerDefault());
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return children;
}
