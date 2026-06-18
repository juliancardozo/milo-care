'use strict';

// Unit tests del clinicService (Kit de Activación Veterinaria).
// Mockeamos modelos y el bus de eventos; usamos el healthScore real (puro).

jest.mock('../../src/models/User', () => ({ find: jest.fn(), findOne: jest.fn(), findById: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/Clinic', () => ({ find: jest.fn(), findOne: jest.fn(), findById: jest.fn(), create: jest.fn() }));
jest.mock('../../src/core/events/eventBus', () => ({ emitEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/referralService', () => ({ generateUniqueCode: jest.fn().mockResolvedValue('MILO-TEST') }));

const User = require('../../src/models/User');
const Clinic = require('../../src/models/Clinic');
const clinicService = require('../../src/services/clinicService');

const NOW = new Date('2026-06-17T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const inDays = (n) => new Date(NOW.getTime() + n * 86400000);

beforeEach(() => jest.clearAllMocks());

describe('slugify', () => {
  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(clinicService.slugify('Clínica Veterinaria Palermo')).toBe('clinica-veterinaria-palermo');
    expect(clinicService.slugify('  San Vicente / Korn  ')).toBe('san-vicente-korn');
  });
  it('cae a "clinica" si queda vacío', () => {
    expect(clinicService.slugify('!!!')).toBe('clinica');
  });
});

describe('attributeSignup — ventana de 7 días', () => {
  function fakeUser() {
    return { _id: 'u1', acquisitionClinicId: null, acquisitionClinicAt: null, save: jest.fn().mockResolvedValue() };
  }

  it('atribuye si el alta ocurre dentro de los 7 días', async () => {
    Clinic.findOne.mockResolvedValue({ _id: 'c1', slug: 'clinica-x' });
    const user = fakeUser();
    const ok = await clinicService.attributeSignup({ user, clinicSlug: 'clinica-x', capturedAt: daysAgo(3), src: 'qr', now: NOW });
    expect(ok).toBe(true);
    expect(user.acquisitionClinicId).toBe('c1');
    expect(user.save).toHaveBeenCalled();
  });

  it('NO atribuye si pasaron más de 7 días', async () => {
    const user = fakeUser();
    const ok = await clinicService.attributeSignup({ user, clinicSlug: 'clinica-x', capturedAt: daysAgo(10), now: NOW });
    expect(ok).toBe(false);
    expect(user.save).not.toHaveBeenCalled();
    expect(Clinic.findOne).not.toHaveBeenCalled();
  });

  it('NO atribuye sin slug de clínica', async () => {
    const user = fakeUser();
    expect(await clinicService.attributeSignup({ user, clinicSlug: null, now: NOW })).toBe(false);
  });

  it('NO atribuye si la clínica no existe', async () => {
    Clinic.findOne.mockResolvedValue(null);
    const user = fakeUser();
    expect(await clinicService.attributeSignup({ user, clinicSlug: 'nope', capturedAt: daysAgo(1), now: NOW })).toBe(false);
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('grantClinicIncentiveOnActivation — idempotente', () => {
  it('otorga premium una vez y marca la fecha', async () => {
    Clinic.findById.mockReturnValue({ lean: () => Promise.resolve({ _id: 'c1', incentivePremiumDays: 30 }) });
    const user = { acquisitionClinicId: 'c1', clinicIncentiveGrantedAt: null, grantPremiumDays: jest.fn(), save: jest.fn().mockResolvedValue() };
    const res = await clinicService.grantClinicIncentiveOnActivation(user, NOW);
    expect(res).toEqual({ granted: true, days: 30 });
    expect(user.grantPremiumDays).toHaveBeenCalledWith(30, NOW);
    expect(user.clinicIncentiveGrantedAt).toBe(NOW);
  });

  it('no vuelve a otorgar si ya se otorgó', async () => {
    const user = { acquisitionClinicId: 'c1', clinicIncentiveGrantedAt: daysAgo(1), grantPremiumDays: jest.fn(), save: jest.fn() };
    const res = await clinicService.grantClinicIncentiveOnActivation(user, NOW);
    expect(res).toEqual({ granted: false });
    expect(Clinic.findById).not.toHaveBeenCalled();
    expect(user.grantPremiumDays).not.toHaveBeenCalled();
  });

  it('no otorga si el usuario no tiene clínica de origen', async () => {
    const user = { acquisitionClinicId: null, clinicIncentiveGrantedAt: null, grantPremiumDays: jest.fn(), save: jest.fn() };
    expect(await clinicService.grantClinicIncentiveOnActivation(user, NOW)).toEqual({ granted: false });
  });
});

describe('computePanel — métricas de impacto', () => {
  it('cuenta referidos, activos, al día, minutos y vencimientos', async () => {
    const upToDateDog = {
      name: 'Milo',
      vaccinations: [{ vaccineName: 'Rabia', nextDueDate: inDays(200) }],
      dewormingHistory: [{ productName: 'Bravecto', nextDueDate: inDays(60) }],
    };
    const overdueDog = {
      name: 'Luna',
      vaccinations: [{ vaccineName: 'Triple', nextDueDate: daysAgo(5) }], // vencida
      dewormingHistory: [],
    };
    const users = [
      { name: 'Ana Pérez', acquisitionClinicAt: daysAgo(2), dogs: [upToDateDog] },   // activo, al día, referido este mes
      { name: 'Beto', acquisitionClinicAt: daysAgo(20), dogs: [overdueDog] },         // activo, no al día, due overdue
      { name: 'Caro', acquisitionClinicAt: daysAgo(1), dogs: [] },                    // referido sin perro (no activo)
    ];
    User.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(users) }) });

    const clinic = { _id: 'c1', name: 'Clínica X', slug: 'clinica-x', logoUrl: null, cohort: 'palermo' };
    const panel = await clinicService.computePanel(clinic, { now: NOW });

    expect(panel.stats.referidosTotal).toBe(3);
    expect(panel.stats.activos).toBe(2);
    expect(panel.stats.alDia).toBe(1);
    expect(panel.stats.minutosAhorrados).toBe(2 * clinicService.MIN_SAVED_PER_ACTIVE);
    expect(panel.link).toContain('/c/clinica-x');
    expect(panel.weekly).toHaveLength(4);
    // Luna tiene una vacuna vencida → aparece en dueSoon marcada overdue.
    const luna = panel.dueSoon.find((d) => d.dogName === 'Luna');
    expect(luna).toBeTruthy();
    expect(luna.overdue).toBe(true);
    expect(luna.ownerFirstName).toBe('Beto');
  });
});
