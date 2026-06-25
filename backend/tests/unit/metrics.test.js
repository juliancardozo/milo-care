'use strict';

const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../src/models/User', () => ({ find: jest.fn() }));
jest.mock('../../src/models/VetAttestation', () => ({ distinct: jest.fn().mockResolvedValue([]) }));
const User = require('../../src/models/User');
const { computeMetrics, prevMonthKey } = require('../../src/services/MetricsService');

const NOW = new Date('2026-06-25T12:00:00Z');

function mockCohort() {
  const users = [{
    dogs: [
      {
        _id: 'd1', partnerId: 'p1', name: 'Luna',
        vaccinations: [{ dateAdministered: new Date('2026-06-10'), nextDueDate: new Date('2027-06-10') }],
        dewormingHistory: [{ dateAdministered: new Date('2026-06-05'), nextDueDate: new Date('2027-06-05') }],
      },
      { _id: 'd2', partnerId: 'p1', name: 'Toby', symptoms: [{ dateObserved: new Date('2026-06-02') }] },
      { _id: 'd3', partnerId: 'other', name: 'Ajeno' },
    ],
  }];
  User.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(users) }) });
}

describe('MetricsService.computeMetrics', () => {
  beforeEach(() => { jest.clearAllMocks(); mockCohort(); });

  it('cuenta solo los perros del partner y los activos del mes', async () => {
    const m = await computeMetrics({ _id: 'p1' }, '2026-06', { now: NOW });
    expect(m.totalPets).toBe(2); // d1, d2 (no d3)
    expect(m.activePets).toBe(2);
    expect(m.eventsByType.vaccinations).toBe(1);
    expect(m.eventsByType.symptoms).toBe(1);
  });

  it('adherencia = % de la cohorte al día (vacunas + desparasitación)', async () => {
    const m = await computeMetrics({ _id: 'p1' }, '2026-06', { now: NOW });
    expect(m.adherenceRate).toBe(0.5); // d1 al día, d2 no
  });

  it('NO incluye PII ni dato clínico individual (solo agregados)', async () => {
    const m = await computeMetrics({ _id: 'p1' }, '2026-06', { now: NOW });
    const json = JSON.stringify(m);
    expect(json).not.toContain('Luna');
    expect(json).not.toContain('Toby');
    expect(m).not.toHaveProperty('dogs');
    expect(m).not.toHaveProperty('pets');
  });

  it('prevMonthKey en UTC', () => {
    expect(prevMonthKey('2026-01')).toBe('2025-12');
    expect(prevMonthKey('2026-07')).toBe('2026-06');
  });
});
