import { describe, it, expect } from 'vitest';
import { resolvePartnerSlug } from '../theme/ThemeProvider';

// loc falso: la función acepta un objeto tipo window.location.
const loc = (hostname, search = '') => ({ hostname, search });

describe('resolvePartnerSlug', () => {
  it('toma el slug del query param ?partner', () => {
    expect(resolvePartnerSlug(loc('app.milocare.org', '?partner=acme'))).toBe('acme');
  });

  it('toma el slug del subdominio', () => {
    expect(resolvePartnerSlug(loc('acme.milocare.org'))).toBe('acme');
  });

  it('sin partner: apex / www / localhost → null (branding default)', () => {
    expect(resolvePartnerSlug(loc('milocare.org'))).toBeNull();
    expect(resolvePartnerSlug(loc('www.milocare.org'))).toBeNull();
    expect(resolvePartnerSlug(loc('app.milocare.org'))).toBeNull();
    expect(resolvePartnerSlug(loc('localhost'))).toBeNull();
  });

  it('el query param tiene prioridad sobre el subdominio', () => {
    expect(resolvePartnerSlug(loc('acme.milocare.org', '?partner=globalbank'))).toBe('globalbank');
  });
});
