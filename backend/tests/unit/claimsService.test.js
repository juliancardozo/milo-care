'use strict';

const { describe, it, expect } = require('@jest/globals');
const { buildDraft } = require('../../src/services/ClaimsService');

const NOW = new Date('2026-06-25T00:00:00Z');

const dog = () => ({
  name: 'Luna',
  symptoms: [
    { _id: 's1', symptomType: 'cojera', dateObserved: new Date('2026-06-10') },
    { _id: 's2', symptomType: 'vomito', dateObserved: new Date('2026-01-01') }, // > 90 días
  ],
  appointments: [
    { _id: 'a1', title: 'Control post-accidente', appointmentDate: new Date('2026-06-12'), isCancelled: false },
    { _id: 'a2', title: 'Cancelada', appointmentDate: new Date('2026-06-13'), isCancelled: true },
  ],
  consultations: [{ _id: 'c1', reason: 'Revisión de pata', dateOfConsult: new Date('2026-06-15') }],
  medications: [],
});

describe('ClaimsService.buildDraft', () => {
  it('arma un borrador con eventos recientes enlazados y resumen ordenado', () => {
    const draft = buildDraft(dog(), { type: 'accident', now: NOW });
    expect(draft.status).toBe('draft');
    expect(draft.type).toBe('accident');
    // Enlaza los de los últimos 90 días (no el síntoma de enero, no la cita cancelada).
    const ids = draft.linkedEvents.map((e) => String(e.itemId));
    expect(ids).toContain('s1');
    expect(ids).toContain('a1');
    expect(ids).toContain('c1');
    expect(ids).not.toContain('s2');
    expect(ids).not.toContain('a2');
    // Resumen cronológico (orden ascendente por fecha).
    const dates = draft.linkedEvents.map((e) => new Date(e.date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it('es informativo: incluye disclaimer y no diagnostica', () => {
    const draft = buildDraft(dog(), { type: 'illness', now: NOW });
    expect(draft.disclaimer).toBeTruthy();
    expect(draft.disclaimer.toLowerCase()).toContain('no constituye diagnóstico');
    expect(draft.generatedSummary).toContain('Luna');
  });

  it('respeta los eventIds elegidos por el tutor', () => {
    const draft = buildDraft(dog(), { type: 'accident', eventIds: ['c1'], now: NOW });
    expect(draft.linkedEvents).toHaveLength(1);
    expect(String(draft.linkedEvents[0].itemId)).toBe('c1');
  });
});
