'use strict';

// Invariantes del catálogo tipado de eventos.

const { validateEvent, EVENT_TYPES } = require('../../src/core/events/catalog');

describe('validateEvent', () => {
  test('evento válido pasa', () => {
    expect(validateEvent('checkin.answered', { question: 'comida', answer: 'mal', channel: 'app' }).ok).toBe(true);
  });

  test('tipo desconocido se rechaza', () => {
    const r = validateEvent('inventado.cosa', {});
    expect(r.ok).toBe(false);
  });

  test('enum inválido se rechaza', () => {
    const r = validateEvent('checkin.answered', { question: 'comida', answer: 'excelente', channel: 'app' });
    expect(r.ok).toBe(false);
  });

  test('campo faltante se rechaza', () => {
    const r = validateEvent('checkin.answered', { question: 'comida', channel: 'app' });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/answer/);
  });

  test('campo extra (no declarado) se rechaza — payloads cerrados', () => {
    const r = validateEvent('referral.signup', { referredEmail: 'x@y.com' });
    expect(r.ok).toBe(false);
  });

  test('texto libre en un code se rechaza (no PII/oraciones)', () => {
    const r = validateEvent('milestone.reached', { milestoneType: 'Milo cumplió 3 años!' });
    expect(r.ok).toBe(false);
  });

  test('code controlado válido pasa', () => {
    expect(validateEvent('milestone.reached', { milestoneType: 'birthday_2026' }).ok).toBe(true);
  });

  test('number debe ser finito', () => {
    expect(validateEvent('symptom.resolved', { type: 'vomito', durationHours: 36 }).ok).toBe(true);
    expect(validateEvent('symptom.resolved', { type: 'vomito', durationHours: 'mucho' }).ok).toBe(false);
  });

  test('campo opcional puede faltar', () => {
    expect(validateEvent('checkin.answered', { question: 'agua', answer: 'bien', channel: 'email' }).ok).toBe(true);
  });

  test('todos los tipos del catálogo son namespace.action', () => {
    for (const t of EVENT_TYPES) expect(t).toMatch(/^[a-z]+\.[a-z_]+$/);
  });
});
