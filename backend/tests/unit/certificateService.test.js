'use strict';

const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../src/models/VetAttestation', () => ({ find: jest.fn() }));
jest.mock('../../src/models/PetScoreCertificate', () => ({ updateMany: jest.fn(), create: jest.fn(), findOne: jest.fn() }));
jest.mock('../../src/services/AuditService', () => ({ record: jest.fn() }));

const VetAttestation = require('../../src/models/VetAttestation');
const PetScoreCertificate = require('../../src/models/PetScoreCertificate');
const CertificateService = require('../../src/services/CertificateService');

const attestations = (arr) => VetAttestation.find.mockReturnValue({ lean: () => Promise.resolve(arr) });

describe('CertificateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PetScoreCertificate.updateMany.mockResolvedValue({});
    PetScoreCertificate.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'cert-1' }));
  });

  it('issue sin atestaciones (self) → lanza NEEDS_VERIFICATION', async () => {
    attestations([]);
    await expect(CertificateService.issue({ _id: 'd1' }, { _id: 'u1' })).rejects.toMatchObject({ code: 'NEEDS_VERIFICATION', status: 400 });
    expect(PetScoreCertificate.create).not.toHaveBeenCalled();
  });

  it('issue con atestación de clínica → certificado certified (supersede el anterior)', async () => {
    attestations([{ status: 'active', clinicId: 'c1', clinicName: 'Clínica Palermo', attestedAt: new Date(), expiresAt: new Date('2027-01-01'), kind: 'vaccination', itemId: 'v1', label: 'Rabia' }]);
    const cert = await CertificateService.issue({ _id: 'd1' }, { _id: 'u1' });
    expect(cert.confidenceLevel).toBe('certified');
    expect(cert.certifiedBy).toBe('Clínica Palermo');
    expect(PetScoreCertificate.updateMany).toHaveBeenCalledWith({ dogId: 'd1', status: 'active' }, { $set: { status: 'superseded' } });
  });

  it('shareableView NO expone el score numérico ni los ítems clínicos', () => {
    const view = CertificateService.shareableView({
      confidenceLevel: 'certified', scoreSnapshot: { score: 90 }, certifiedBy: 'X',
      attestedItems: [{ label: 'Rabia' }], attestedCount: 1, issuedAt: new Date(), validUntil: new Date(), status: 'active',
    });
    expect(view).not.toHaveProperty('score');
    expect(view).not.toHaveProperty('scoreSnapshot');
    expect(view).not.toHaveProperty('attestedItems');
    expect(view.confidenceLevel).toBe('certified');
  });
});
