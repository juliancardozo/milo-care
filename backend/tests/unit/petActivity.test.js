'use strict';

const { describe, it, expect } = require('@jest/globals');
const { isPetActive } = require('../../src/services/petActivity');

const d = (s) => new Date(s);

describe('petActivity.isPetActive', () => {
  it('perro sin eventos → inactivo', () => {
    expect(isPetActive({}, '2026-06')).toBe(false);
    expect(isPetActive(null, '2026-06')).toBe(false);
  });

  it('vacuna aplicada en el mes → activo', () => {
    const pet = { vaccinations: [{ dateAdministered: d('2026-06-10') }] };
    expect(isPetActive(pet, '2026-06')).toBe(true);
  });

  it('evento en otro mes → inactivo en el mes consultado', () => {
    const pet = { vaccinations: [{ dateAdministered: d('2026-05-31T23:00:00Z') }] };
    expect(isPetActive(pet, '2026-06')).toBe(false);
  });

  it('cuenta cualquier tipo de evento (síntoma, cita, medicación, consulta, desparasitación)', () => {
    expect(isPetActive({ symptoms: [{ dateObserved: d('2026-06-02') }] }, '2026-06')).toBe(true);
    expect(isPetActive({ appointments: [{ appointmentDate: d('2026-06-02') }] }, '2026-06')).toBe(true);
    expect(isPetActive({ medications: [{ startDate: d('2026-06-02') }] }, '2026-06')).toBe(true);
    expect(isPetActive({ consultations: [{ dateOfConsult: d('2026-06-02') }] }, '2026-06')).toBe(true);
    expect(isPetActive({ dewormingHistory: [{ dateAdministered: d('2026-06-02') }] }, '2026-06')).toBe(true);
  });

  it('una atestación cumplida (vetValidatedAt) en el mes → activo', () => {
    const pet = { vaccinations: [{ dateAdministered: d('2024-01-01'), vetValidatedAt: d('2026-06-15') }] };
    expect(isPetActive(pet, '2026-06')).toBe(true);
  });

  it('registrar en la app este mes (createdAt) cuenta como actividad', () => {
    const pet = { appointments: [{ appointmentDate: d('2026-09-01'), createdAt: d('2026-06-20') }] };
    expect(isPetActive(pet, '2026-06')).toBe(true);
  });

  it('límites del mes (UTC): primer instante activo, primer instante del mes siguiente no', () => {
    const first = { symptoms: [{ dateObserved: d('2026-06-01T00:00:00Z') }] };
    const next = { symptoms: [{ dateObserved: d('2026-07-01T00:00:00Z') }] };
    expect(isPetActive(first, '2026-06')).toBe(true);
    expect(isPetActive(next, '2026-06')).toBe(false);
  });

  it('acepta un Date como mes', () => {
    const pet = { vaccinations: [{ dateAdministered: d('2026-06-10') }] };
    expect(isPetActive(pet, d('2026-06-25T12:00:00Z'))).toBe(true);
  });
});
