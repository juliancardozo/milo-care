'use strict';

// Tests puros de la regla acumulativa de vómitos.

const { evaluateVomitRule } = require('../../src/services/symptomAlertService');

const NOW = new Date('2026-06-12T18:00:00.000Z');

// Perro adulto (nacido hace ~5 años) y cachorro (~4 meses).
const adult = { dateOfBirth: '2021-01-01' };
const puppy = { dateOfBirth: '2026-02-12' };

function vomit(hoursAgo) {
  return { quickType: 'vomito', dateObserved: new Date(NOW.getTime() - hoursAgo * 3600 * 1000) };
}

describe('evaluateVomitRule', () => {
  test('adulto con 1 vómito en 24h → sin alerta', () => {
    const res = evaluateVomitRule(adult, [vomit(2)], NOW);
    expect(res.triggered).toBe(false);
    expect(res.threshold).toBe(2);
  });

  test('adulto con 2 vómitos en 24h → alerta', () => {
    const res = evaluateVomitRule(adult, [vomit(2), vomit(10)], NOW);
    expect(res.triggered).toBe(true);
    expect(res.count).toBe(2);
    expect(res.isPuppy).toBe(false);
  });

  test('cachorro con 1 vómito → alerta (umbral 1)', () => {
    const res = evaluateVomitRule(puppy, [vomit(3)], NOW);
    expect(res.triggered).toBe(true);
    expect(res.isPuppy).toBe(true);
    expect(res.threshold).toBe(1);
  });

  test('adulto con 2 vómitos pero uno fuera de la ventana de 24h → sin alerta', () => {
    const res = evaluateVomitRule(adult, [vomit(2), vomit(30)], NOW);
    expect(res.triggered).toBe(false);
    expect(res.count).toBe(1);
  });

  test('vómito detectado también por texto libre (síntoma manual)', () => {
    const manual = { description: 'Vómito con bilis', dateObserved: new Date(NOW.getTime() - 1 * 3600 * 1000) };
    const res = evaluateVomitRule(adult, [manual, vomit(5)], NOW);
    expect(res.triggered).toBe(true);
  });

  test('otros síntomas no cuentan como vómito', () => {
    const cough = { quickType: 'tos', dateObserved: NOW };
    const res = evaluateVomitRule(adult, [cough, cough], NOW);
    expect(res.triggered).toBe(false);
  });
});
