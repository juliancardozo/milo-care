import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl, apiUrl, API_BASE_URL } from './apiBase';

describe('resolveApiBaseUrl', () => {
  it('usa /api por defecto (producción sin variable)', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api');
    expect(resolveApiBaseUrl('')).toBe('/api');
    expect(resolveApiBaseUrl('   ')).toBe('/api');
  });

  it('respeta una URL absoluta y le quita la barra final', () => {
    expect(resolveApiBaseUrl('https://milo-care-staging.onrender.com/api/')).toBe('https://milo-care-staging.onrender.com/api');
  });
});

describe('apiUrl', () => {
  it('arma rutas sobre la base por defecto', () => {
    expect(API_BASE_URL).toBe('/api');
    expect(apiUrl('/dogs/1/export.pdf')).toBe('/api/dogs/1/export.pdf');
    expect(apiUrl('admin/email/preview/x')).toBe('/api/admin/email/preview/x');
  });
});
