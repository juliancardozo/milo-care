'use strict';

const { describe, it, expect } = require('@jest/globals');
const EntitlementService = require('../../src/services/EntitlementService');

// Helpers: POJOs que imitan documentos Mongoose (EntitlementService los soporta).
const freeUser = () => ({ tier: 'free', premiumUntil: null });
const premiumUser = () => ({ tier: 'premium', premiumUntil: null });
const premiumWindowUser = (until) => ({ tier: 'free', premiumUntil: until });
const dog = (sponsorshipStatus = 'none') => ({ _id: 'd1', name: 'Luna', sponsorshipStatus });

describe('EntitlementService', () => {
  describe('isPremium', () => {
    it('free user → false', () => {
      expect(EntitlementService.isPremium(freeUser())).toBe(false);
    });
    it('premium permanente → true', () => {
      expect(EntitlementService.isPremium(premiumUser())).toBe(true);
    });
    it('ventana premiumUntil vigente → true', () => {
      const future = new Date('2026-12-31');
      expect(EntitlementService.isPremium(premiumWindowUser(future), new Date('2026-06-25'))).toBe(true);
    });
    it('ventana premiumUntil vencida → false', () => {
      const past = new Date('2026-01-01');
      expect(EntitlementService.isPremium(premiumWindowUser(past), new Date('2026-06-25'))).toBe(false);
    });
  });

  describe('resolve — premium O sponsorship', () => {
    it('ninguno: free + no sponsored → todas las gated en false', () => {
      const r = EntitlementService.resolve(freeUser(), dog('none'));
      expect(r.source).toBe('none');
      expect(r.features.pdfExport).toBe(false);
      expect(r.features.unlimitedDogs).toBe(false);
    });

    it('solo premium: desbloquea features de usuario y de perro', () => {
      const r = EntitlementService.resolve(premiumUser(), dog('none'));
      expect(r.source).toBe('premium');
      expect(r.features.unlimitedDogs).toBe(true);
      expect(r.features.pdfExport).toBe(true);
      expect(r.features.whatsappShare).toBe(true);
    });

    it('solo sponsorship: desbloquea features de perro, NO las de usuario', () => {
      const r = EntitlementService.resolve(freeUser(), dog('sponsored'));
      expect(r.source).toBe('sponsorship');
      expect(r.features.pdfExport).toBe(true);
      expect(r.features.whatsappShare).toBe(true);
      // unlimitedDogs es de alcance usuario: el patrocinio de un perro no la habilita.
      expect(r.features.unlimitedDogs).toBe(false);
    });

    it('ambos: premium gana como source', () => {
      const r = EntitlementService.resolve(premiumUser(), dog('sponsored'));
      expect(r.source).toBe('premium');
      expect(r.features.pdfExport).toBe(true);
      expect(r.features.unlimitedDogs).toBe(true);
    });
  });

  describe('can / assertCan', () => {
    it('feature no gateada → siempre true', () => {
      expect(EntitlementService.can(freeUser(), dog('none'), 'someFreeFeature')).toBe(true);
    });
    it('pdfExport: free no sponsored → false; sponsored → true', () => {
      expect(EntitlementService.can(freeUser(), dog('none'), 'pdfExport')).toBe(false);
      expect(EntitlementService.can(freeUser(), dog('sponsored'), 'pdfExport')).toBe(true);
    });
    it('unlimitedDogs: sponsorship NO alcanza', () => {
      expect(EntitlementService.can(freeUser(), dog('sponsored'), 'unlimitedDogs')).toBe(false);
      expect(EntitlementService.can(premiumUser(), dog('none'), 'unlimitedDogs')).toBe(true);
    });
    it('assertCan lanza UPGRADE_REQUIRED (403) si falta entitlement', () => {
      expect(() => EntitlementService.assertCan(freeUser(), dog('none'), 'pdfExport')).toThrow();
      try {
        EntitlementService.assertCan(freeUser(), dog('none'), 'pdfExport');
      } catch (err) {
        expect(err.status).toBe(403);
        expect(err.code).toBe('UPGRADE_REQUIRED');
        expect(err.feature).toBe('pdfExport');
      }
    });
    it('assertCan no lanza si hay entitlement', () => {
      expect(() => EntitlementService.assertCan(premiumUser(), dog('none'), 'pdfExport')).not.toThrow();
      expect(() => EntitlementService.assertCan(freeUser(), dog('sponsored'), 'pdfExport')).not.toThrow();
    });
  });
});
