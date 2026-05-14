/**
 * Unit Tests: Window Resolution Logic
 * Tests for look-ahead window precedence, boundary validation, and invalid input fallback
 * IMPORTANT: These tests must FAIL before implementation (TDD approach)
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock the window resolution service (will be implemented)
let windowResolution;

beforeEach(() => {
  // Clear module cache and re-require to reset state
  jest.resetModules();
  windowResolution = require('../../src/services/windowResolution');
});

describe('Window Resolution Service', () => {
  describe('Precedence Order: temporary > preference > default', () => {
    it('should apply temporary override parameter over all other values', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: 14,
        userPreference: 21,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.windowDays).toBe(14);
      expect(result.windowSource).toBe('temporary-override');
    });

    it('should apply user preference when no temporary override', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: null,
        userPreference: 21,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.windowDays).toBe(21);
      expect(result.windowSource).toBe('user-preference');
    });

    it('should apply default 7 days when neither override nor preference', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: null,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.windowDays).toBe(7);
      expect(result.windowSource).toBe('default');
    });
  });

  describe('Boundary Validation (1-60 days)', () => {
    it('should reject window < 1 day', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: 0,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.windowDays).toBe(7); // fallback to default
      expect(result.windowSource).toBe('default');
      expect(result.fallbackReason).toBeDefined();
      expect(result.fallbackReason.toLowerCase()).toContain('default');
    });

    it('should reject window > 60 days', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: 100,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.windowDays).toBe(7); // fallback to default
      expect(result.windowSource).toBe('default');
      expect(result.fallbackReason).toBeDefined();
      expect(result.fallbackReason.toLowerCase()).toContain('default');
    });

    it('should accept boundary values (1 and 60)', () => {
      const result1 = windowResolution.resolveWindow({
        tempWindowDays: 1,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });
      expect(result1.windowDays).toBe(1);

      const result60 = windowResolution.resolveWindow({
        tempWindowDays: 60,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });
      expect(result60.windowDays).toBe(60);
    });
  });

  describe('Invalid Input Fallback', () => {
    it('should provide user-facing explanation for invalid window', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: -5,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.fallbackReason).toBeDefined();
      expect(result.fallbackReason.toLowerCase()).toContain('default');
    });

    it('should provide explanation message mentioning default 7 days', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: 500,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.fallbackReason).toContain('7');
    });

    it('should handle NaN and undefined gracefully', () => {
      const resultNaN = windowResolution.resolveWindow({
        tempWindowDays: NaN,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });
      expect(resultNaN.windowDays).toBe(7);

      const resultUndefined = windowResolution.resolveWindow({
        tempWindowDays: undefined,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });
      expect(resultUndefined.windowDays).toBe(7);
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with windowDays, windowSource, appliedAt', () => {
      const now = new Date('2026-05-14T10:00:00Z');
      const result = windowResolution.resolveWindow({
        tempWindowDays: 14,
        userPreference: null,
        now,
      });

      expect(result).toHaveProperty('windowDays');
      expect(result).toHaveProperty('windowSource');
      expect(result).toHaveProperty('appliedAt');
      expect(typeof result.windowDays).toBe('number');
      expect(typeof result.windowSource).toBe('string');
      expect(result.appliedAt instanceof Date).toBe(true);
    });

    it('should include fallbackReason when fallback occurred', () => {
      const result = windowResolution.resolveWindow({
        tempWindowDays: 999,
        userPreference: null,
        now: new Date('2026-05-14T10:00:00Z'),
      });

      expect(result.fallbackReason).toBeDefined();
      expect(typeof result.fallbackReason).toBe('string');
    });
  });
});
