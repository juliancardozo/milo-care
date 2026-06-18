'use strict';

const {
  matchVaccineId,
  nextVaccineDueDate,
  internalDewormingIntervalDays,
  nextDewormingDueDate,
} = require('../../src/services/preventiveScheduling');
const { resolveExternalProduct } = require('../../src/config/antiparasiticCatalog');
const { validateMandates } = require('../../src/services/VaccineRulesEngine');

const from = new Date('2026-06-16T00:00:00.000Z');
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const monthsApprox = (a, b) => Math.round(daysBetween(a, b) / 30.4);

describe('preventiveScheduling — vaccines (Phase A)', () => {
  it('maps free-text names to catalog ids', () => {
    expect(matchVaccineId('Antirrábica (Rabia)')).toBe('rabia');
    expect(matchVaccineId('Triple')).toBe('triple_core');
    expect(matchVaccineId('Quíntuple')).toBe('quintuple');
    expect(matchVaccineId('algo desconocido')).toBeNull();
  });

  it('rabies reschedules annually', () => {
    const r = nextVaccineDueDate({ vaccineName: 'Rabia', fromDate: from, country: 'AR', ageMonths: 24 });
    expect(monthsApprox(from, r.dueDate)).toBe(12);
    expect(r.intervalLabel).toBe('anual');
  });

  it('adult core (triple) reschedules every 3 years per WSAVA catalog', () => {
    const r = nextVaccineDueDate({ vaccineName: 'Triple', fromDate: from, ageMonths: 36 });
    expect(r.intervalLabel).toBe('cada 3 años');
  });

  it('puppy series gets a ~3 week next dose', () => {
    const r = nextVaccineDueDate({ vaccineName: 'Triple', fromDate: from, ageMonths: 2 });
    expect(daysBetween(from, r.dueDate)).toBe(21);
    expect(r.requiresVetValidation).toBe(true);
  });

  it('leptospira-containing reschedules annually', () => {
    const r = nextVaccineDueDate({ vaccineName: 'Quíntuple', fromDate: from, ageMonths: 24 });
    expect(monthsApprox(from, r.dueDate)).toBe(12);
  });

  it('returns null for unknown vaccines (no invented cadence)', () => {
    expect(nextVaccineDueDate({ vaccineName: 'X', fromDate: from })).toBeNull();
  });
});

describe('preventiveScheduling — internal deworming by stage (Phase C)', () => {
  it('puppy < 3 months → every 14 days', () => {
    expect(internalDewormingIntervalDays(2, 'low')).toBe(14);
  });
  it('puppy 3–6 months → monthly', () => {
    expect(internalDewormingIntervalDays(4, 'low')).toBe(30);
  });
  it('adult low risk → quarterly, high risk → monthly', () => {
    expect(internalDewormingIntervalDays(24, 'low')).toBe(90);
    expect(internalDewormingIntervalDays(24, 'high')).toBe(30);
  });
});

describe('preventiveScheduling — external antiparasitics by product (Phase B)', () => {
  it('resolves product → interval', () => {
    expect(resolveExternalProduct('Bravecto').intervalDays).toBe(84);
    expect(resolveExternalProduct('NexGard').intervalDays).toBe(30);
    expect(resolveExternalProduct('Collar Seresto').intervalDays).toBe(210);
    expect(resolveExternalProduct('producto raro').intervalDays).toBe(30);
  });

  it('external deworming next due uses product interval', () => {
    const r = nextDewormingDueDate({ productName: 'Bravecto', parasiteType: 'external', fromDate: from });
    expect(daysBetween(from, r.dueDate)).toBe(84);
    expect(r.basis).toBe('external:isoxazoline_extended');
  });

  it('internal deworming next due uses stage cadence', () => {
    const r = nextDewormingDueDate({ parasiteType: 'internal', fromDate: from, ageMonths: 24, riskLevel: 'high' });
    expect(daysBetween(from, r.dueDate)).toBe(30);
    expect(r.basis).toBe('internal:stage');
  });
});

describe('regulatory framing AR vs UY (Phase D)', () => {
  it('AR rabies is legally mandatory', () => {
    const r = validateMandates('AR', 'Rabia');
    expect(r.isMandatory).toBe(true);
    expect(r.law).toBe('Ley N° 22.953');
  });

  it('UY rabies is not domestically mandatory (mobility-driven)', () => {
    const r = validateMandates('UY', 'Rabia');
    expect(r.isMandatory).toBe(false);
    expect(r.reason).toBe('mobility');
  });

  it('non-rabies vaccines are advisory in both countries', () => {
    expect(validateMandates('AR', 'Triple').isMandatory).toBe(false);
  });
});
