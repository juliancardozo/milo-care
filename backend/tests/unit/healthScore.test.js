'use strict';

const { computeHealthScore } = require('../../src/services/healthScore');

const NOW = new Date('2026-06-15T12:00:00Z');
const future = (days) => new Date(NOW.getTime() + days * 86400000);
const past = (days) => new Date(NOW.getTime() - days * 86400000);

describe('computeHealthScore', () => {
  test('perro vacío y sin datos: score bajo, grado de atención', () => {
    const { score, grade, factors } = computeHealthScore({}, { now: NOW, streak: 0 });
    // Solo suma el factor "sin síntomas recientes" (15); el resto queda en 0.
    expect(score).toBe(15);
    expect(grade.key).toBe('attention');
    expect(factors).toHaveLength(6);
    expect(factors.find((f) => f.key === 'vaccines').points).toBe(0);
  });

  test('perro bien cuidado: score alto', () => {
    const dog = {
      vaccinations: [{ dateAdministered: past(30), nextDueDate: future(180) }],
      dewormingHistory: [{ dateAdministered: past(20), nextDueDate: future(60) }],
      symptoms: [],
      photoUrl: 'x.jpg',
      weightKg: 12,
      sex: 'male',
      appointments: [{ appointmentDate: future(20), isCancelled: false }],
      consultations: [],
    };
    const { score, grade } = computeHealthScore(dog, { now: NOW, streak: 10 });
    expect(score).toBe(100);
    expect(grade.key).toBe('excellent');
  });

  test('refuerzo de vacuna vencido baja el factor a warn', () => {
    const dog = { vaccinations: [{ dateAdministered: past(400), nextDueDate: past(10) }] };
    const f = computeHealthScore(dog, { now: NOW, streak: 0 }).factors.find((x) => x.key === 'vaccines');
    expect(f.status).toBe('warn');
    expect(f.points).toBe(12);
  });

  test('síntoma severo no resuelto penaliza el bienestar', () => {
    const dog = { symptoms: [{ dateObserved: past(2), severity: 'severe', resolved: false }] };
    const f = computeHealthScore(dog, { now: NOW, streak: 0 }).factors.find((x) => x.key === 'wellbeing');
    expect(f.status).toBe('bad');
    expect(f.points).toBe(3);
  });

  test('racha de check-in de 7+ días da el máximo del factor', () => {
    const f = computeHealthScore({}, { now: NOW, streak: 7 }).factors.find((x) => x.key === 'checkin');
    expect(f.points).toBe(20);
  });

  test('el score nunca supera 100 ni baja de 0', () => {
    const { score } = computeHealthScore({}, { now: NOW, streak: 999 });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
