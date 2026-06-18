import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { storeClinic, getStoredClinic, clearStoredClinic } from '../services/clinicApi';

describe('clinicApi — atribución de clínica (ventana de 7 días)', () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('persiste y recupera una clínica recién capturada', () => {
    storeClinic('clinica-x', 'qr');
    const stored = getStoredClinic();
    expect(stored.slug).toBe('clinica-x');
    expect(stored.src).toBe('qr');
  });

  it('devuelve null cuando la captura tiene más de 7 días', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('milocare.clinic', JSON.stringify({ slug: 'clinica-x', src: 'link', ts: eightDaysAgo }));
    expect(getStoredClinic()).toBeNull();
  });

  it('sigue válida justo dentro de la ventana (6 días)', () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    localStorage.setItem('milocare.clinic', JSON.stringify({ slug: 'clinica-x', src: 'link', ts: sixDaysAgo }));
    expect(getStoredClinic()?.slug).toBe('clinica-x');
  });

  it('clearStoredClinic borra la atribución', () => {
    storeClinic('clinica-x', 'qr');
    clearStoredClinic();
    expect(getStoredClinic()).toBeNull();
  });
});
