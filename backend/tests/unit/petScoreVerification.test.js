'use strict';

const { describe, it, expect } = require('@jest/globals');
const { deriveVerification } = require('../../src/services/petScoreVerification');

const NOW = new Date('2026-06-25T12:00:00Z');
const FUTURE = new Date('2027-01-01T00:00:00Z');
const PAST = new Date('2026-01-01T00:00:00Z');

const att = (over = {}) => ({
  status: 'active',
  kind: 'vaccination',
  itemId: 'v1',
  label: 'Rabia',
  attestedAt: new Date('2026-06-01'),
  expiresAt: FUTURE,
  clinicId: null,
  clinicName: null,
  source: 'token',
  ...over,
});

describe('petScoreVerification.deriveVerification', () => {
  it('sin atestaciones → self', () => {
    const v = deriveVerification([], NOW);
    expect(v.level).toBe('self');
    expect(v.certifiedBy).toBeNull();
    expect(v.attestedItems).toHaveLength(0);
  });

  it('atestación anónima (token) → verified, sin clínica', () => {
    const v = deriveVerification([att()], NOW);
    expect(v.level).toBe('verified');
    expect(v.certifiedBy).toBeNull();
    expect(v.attestedItems).toHaveLength(1);
  });

  it('atestación con clínica → certified + certifiedBy', () => {
    const v = deriveVerification([att({ clinicId: 'c1', clinicName: 'Clínica Palermo', source: 'vet_account' })], NOW);
    expect(v.level).toBe('certified');
    expect(v.certifiedBy).toBe('Clínica Palermo');
  });

  it('mezcla: con clínica gana certified sobre las anónimas', () => {
    const v = deriveVerification([att(), att({ itemId: 'v2', clinicId: 'c1', clinicName: 'Vet Centro', source: 'vet_account' })], NOW);
    expect(v.level).toBe('certified');
    expect(v.certifiedBy).toBe('Vet Centro');
    expect(v.attestedItems).toHaveLength(2);
  });

  it('atestaciones vencidas o revocadas no cuentan', () => {
    const expired = att({ expiresAt: PAST });
    const revoked = att({ itemId: 'v2', status: 'revoked' });
    expect(deriveVerification([expired, revoked], NOW).level).toBe('self');
  });

  it('validUntil = la atestación activa que vence primero', () => {
    const soon = new Date('2026-09-01');
    const v = deriveVerification([att({ expiresAt: FUTURE }), att({ itemId: 'v2', expiresAt: soon })], NOW);
    expect(new Date(v.validUntil).getTime()).toBe(soon.getTime());
  });
});
