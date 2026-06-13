'use strict';

const { detectMilestones } = require('../../src/services/milestoneService');

const NOW = new Date('2026-06-12T12:00:00.000Z');
const TZ = 'America/Argentina/Buenos_Aires';

function ctx(overrides = {}) {
  return { now: NOW, tz: TZ, checkinStreak: 0, achievementsCount: 0, vaccinesUpToDate: false, tenureDays: 0, ...overrides };
}

describe('detectMilestones', () => {
  test('racha de 7 dispara streak_7 (no 30/100)', () => {
    const keys = detectMilestones({}, ctx({ checkinStreak: 7 })).map((m) => m.key);
    expect(keys).toContain('streak_7');
    expect(keys).not.toContain('streak_30');
  });

  test('racha de 100 dispara los tres umbrales', () => {
    const keys = detectMilestones({}, ctx({ checkinStreak: 100 })).map((m) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['streak_7', 'streak_30', 'streak_100']));
  });

  test('primer mes según antigüedad', () => {
    expect(detectMilestones({}, ctx({ tenureDays: 29 })).map((m) => m.key)).not.toContain('first_month');
    expect(detectMilestones({}, ctx({ tenureDays: 30 })).map((m) => m.key)).toContain('first_month');
  });

  test('vacunas-100 requiere antigüedad Y vacunas al día', () => {
    expect(detectMilestones({}, ctx({ tenureDays: 120, vaccinesUpToDate: false })).map((m) => m.key)).not.toContain('vaccines_100_days');
    expect(detectMilestones({}, ctx({ tenureDays: 120, vaccinesUpToDate: true })).map((m) => m.key)).toContain('vaccines_100_days');
  });

  test('logros por umbral', () => {
    const keys = detectMilestones({}, ctx({ achievementsCount: 12 })).map((m) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['achievements_5', 'achievements_10']));
    expect(keys).not.toContain('achievements_25');
  });

  test('cumpleaños cuando coincide el día (en la TZ del usuario)', () => {
    // 12 de junio (local) → cumple si el perro nació un 12/06.
    const dog = { dateOfBirth: new Date('2022-06-12T00:00:00.000Z') };
    const bday = detectMilestones(dog, ctx()).find((m) => m.type === 'birthday');
    expect(bday).toBeTruthy();
    expect(bday.key).toBe('birthday_2026');
    expect(bday.value.age).toBe(4);
  });

  test('sin cumpleaños cuando no coincide', () => {
    const dog = { dateOfBirth: new Date('2022-03-01T00:00:00.000Z') };
    expect(detectMilestones(dog, ctx()).some((m) => m.type === 'birthday')).toBe(false);
  });
});
