'use strict';

const { describe, it, expect } = require('@jest/globals');
const { checkCoverage } = require('../../src/services/CoverageService');

const NOW = new Date('2026-06-25T00:00:00Z');

const policy = (over = {}) => ({
  startDate: new Date('2026-06-01'),
  coverage: [
    { item: 'accidente', covered: true, limit: 50000, currency: 'UYU', carenciaDays: 0 },
    { item: 'cirugia', covered: true, limit: 100000, currency: 'UYU', carenciaDays: 60 },
    { item: 'estetica', covered: false, carenciaDays: 0 },
  ],
  ...over,
});

describe('CoverageService.checkCoverage', () => {
  it('SIEMPRE incluye disclaimer y nunca afirma cobertura vinculante', () => {
    const r = checkCoverage(policy(), 'accidente', NOW);
    expect(r.disclaimer).toBeTruthy();
    expect(r.disclaimer.toLowerCase()).toContain('no es una confirmación');
    // El mensaje orienta ("probablemente"), no afirma como hecho.
    expect(r.message.toLowerCase()).toContain('probablemente');
  });

  it('ítem cubierto y fuera de carencia → likelyCovered true', () => {
    const r = checkCoverage(policy(), 'accidente', NOW);
    expect(r.likelyCovered).toBe(true);
    expect(r.item).toBe('accidente');
    expect(r.inCarencia).toBe(false);
  });

  it('ítem cubierto pero dentro de carencia → likelyCovered false + aviso de carencia', () => {
    const r = checkCoverage(policy(), 'cirugia', NOW); // alta 2026-06-01, carencia 60 días
    expect(r.inCarencia).toBe(true);
    expect(r.likelyCovered).toBe(false);
    expect(r.message.toLowerCase()).toContain('carencia');
  });

  it('ítem explícitamente NO cubierto → likelyCovered false', () => {
    const r = checkCoverage(policy(), 'estetica', NOW);
    expect(r.likelyCovered).toBe(false);
    expect(r.message.toLowerCase()).toContain('no cubierto');
  });

  it('evento que no figura en la póliza → confidence unknown, deriva a la aseguradora', () => {
    const r = checkCoverage(policy(), 'odontologia', NOW);
    expect(r.confidence).toBe('unknown');
    expect(r.likelyCovered).toBe(false);
    expect(r.disclaimer).toBeTruthy();
  });

  it('matchea por sinónimos (fractura → accidente)', () => {
    const r = checkCoverage(policy(), 'fractura', NOW);
    expect(r.item).toBe('accidente');
  });
});
