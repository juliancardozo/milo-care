'use strict';

const {
  validateOwner,
  validateDogBasics,
  validateClinicalHistory,
  lifeStageFromAgeMonths,
} = require('../../src/services/ValidationService');

describe('Unit: onboarding validation', () => {
  it('requires disclaimer acceptance on owner step', () => {
    const result = validateOwner({
      name: 'Owner',
      email: 'owner@example.com',
      country: 'AR',
      disclaimerAccepted: false,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.toLowerCase().includes('disclaimer'))).toBe(true);
  });

  it('rejects future dog birth date', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = validateDogBasics({
      name: 'Milo',
      breed: 'Mixed',
      birthDate: tomorrow,
      size: 'medium',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.toLowerCase().includes('future'))).toBe(true);
  });

  it('returns red flag failure when severe symptoms are present', () => {
    const result = validateClinicalHistory({
      recentSymptoms: {
        hasSeizures: true,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.redFlags.hasSevere).toBe(true);
  });

  it('maps age to expected life stage boundaries', () => {
    expect(lifeStageFromAgeMonths(1)).toBe('neonatal');
    expect(lifeStageFromAgeMonths(4)).toBe('late_puppy');
    expect(lifeStageFromAgeMonths(24)).toBe('adult');
    expect(lifeStageFromAgeMonths(100)).toBe('senior');
  });
});
