/**
 * Unit Tests: Barrio vaccination compliance (semáforo antirrábica).
 * Pure logic — `now` is injected explicitly (no time mocking).
 */

const { describe, it, expect } = require('@jest/globals');
const { dogRabiesStatus, STATUS } = require('../../src/services/barrioCompliance');

const NOW = new Date('2026-07-10T12:00:00Z');
const daysFrom = (n) => new Date(NOW.getTime() + n * 86400000);
const dog = (vaccinations) => ({ vaccinations });

describe('barrioCompliance.dogRabiesStatus', () => {
  it('returns sin_registro when there is no rabies vaccine', () => {
    expect(dogRabiesStatus(dog([]), NOW).status).toBe('sin_registro');
    expect(dogRabiesStatus(dog([{ vaccineName: 'Triple', dateAdministered: daysFrom(-10), nextDueDate: daysFrom(300) }]), NOW).status)
      .toBe('sin_registro');
  });

  it('matches rabies by name variants (Rabia / Antirrábica / Rabies)', () => {
    for (const vaccineName of ['Rabia', 'Antirrábica', 'Vacuna antirrabica', 'Rabies']) {
      const res = dogRabiesStatus(dog([{ vaccineName, dateAdministered: daysFrom(-10), nextDueDate: daysFrom(300) }]), NOW);
      expect(res.status).toBe('al_dia');
    }
  });

  it('flags vencido when nextDueDate is in the past', () => {
    const res = dogRabiesStatus(dog([{ vaccineName: 'Rabia', dateAdministered: daysFrom(-400), nextDueDate: daysFrom(-5) }]), NOW);
    expect(res.status).toBe('vencido');
  });

  it('flags por_vencer within the 30-day window', () => {
    const res = dogRabiesStatus(dog([{ vaccineName: 'Rabia', dateAdministered: daysFrom(-340), nextDueDate: daysFrom(20) }]), NOW);
    expect(res.status).toBe('por_vencer');
  });

  it('derives a 12-month due date when nextDueDate is missing', () => {
    // Applied 2 months ago, no explicit due date → due ~10 months ahead → al_dia.
    const res = dogRabiesStatus(dog([{ vaccineName: 'Rabia', dateAdministered: daysFrom(-60), nextDueDate: null }]), NOW);
    expect(res.status).toBe('al_dia');
    expect(res.nextDueDate).toBeInstanceOf(Date);

    // Applied 13 months ago, no due date → derived due 1 month ago → vencido.
    const stale = dogRabiesStatus(dog([{ vaccineName: 'Rabia', dateAdministered: daysFrom(-395), nextDueDate: null }]), NOW);
    expect(stale.status).toBe('vencido');
  });

  it('uses the most recent rabies shot when several exist', () => {
    const res = dogRabiesStatus(dog([
      { vaccineName: 'Rabia', dateAdministered: daysFrom(-800), nextDueDate: daysFrom(-430) },
      { vaccineName: 'Rabia', dateAdministered: daysFrom(-20), nextDueDate: daysFrom(345) },
    ]), NOW);
    expect(res.status).toBe('al_dia');
  });

  it('ranks statuses vencido < sin_registro < por_vencer < al_dia (worst first)', () => {
    expect(STATUS.vencido.rank).toBeLessThan(STATUS.sin_registro.rank);
    expect(STATUS.sin_registro.rank).toBeLessThan(STATUS.por_vencer.rank);
    expect(STATUS.por_vencer.rank).toBeLessThan(STATUS.al_dia.rank);
  });
});
