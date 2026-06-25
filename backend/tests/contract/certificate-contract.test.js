'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => { req.user = { id: 'user-1' }; next(); });
jest.mock('../../src/services/DogAccess', () => ({ loadForRequest: jest.fn() }));
jest.mock('../../src/services/CertificateService', () => ({ issue: jest.fn(), getActive: jest.fn(), shareableView: jest.fn() }));
jest.mock('../../src/services/ConsentService', () => ({ grant: jest.fn(), revoke: jest.fn(), hasConsent: jest.fn(), listForDog: jest.fn() }));
jest.mock('../../src/models/Partner', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/WebhookService', () => ({ deliver: jest.fn() }));
jest.mock('../../src/services/AuditService', () => ({ record: jest.fn() }));

const DogAccess = require('../../src/services/DogAccess');
const CertificateService = require('../../src/services/CertificateService');
const ConsentService = require('../../src/services/ConsentService');
const Partner = require('../../src/models/Partner');
const WebhookService = require('../../src/services/WebhookService');
const app = require('../../src/app');

const CERT = {
  _id: 'cert-1', confidenceLevel: 'certified', scoreSnapshot: { score: 82, grade: 'Muy bien' },
  certifiedBy: 'Clínica Palermo', attestedCount: 2, attestedItems: [], issuedAt: new Date(), validUntil: new Date('2027-01-01'), status: 'active',
};

describe('Contract: PetScoreCertificate + consentimiento + compartir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DogAccess.loadForRequest.mockResolvedValue({ owner: { _id: 'user-1', partnerId: 'p1' }, dog: { _id: 'dog-1', partnerId: 'p1' } });
  });

  it('POST /certificate emite el certificado', async () => {
    CertificateService.issue.mockResolvedValue(CERT);
    const res = await request(app).post('/api/dogs/dog-1/certificate');
    expect(res.status).toBe(201);
    expect(res.body.confidenceLevel).toBe('certified');
    expect(res.body.score).toBe(82);
  });

  it('POST /certificate sin verificación → 400 NEEDS_VERIFICATION', async () => {
    const err = new Error('needs vet'); err.status = 400; err.code = 'NEEDS_VERIFICATION';
    CertificateService.issue.mockRejectedValue(err);
    const res = await request(app).post('/api/dogs/dog-1/certificate');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NEEDS_VERIFICATION');
  });

  it('POST /consent otorga consentimiento granular', async () => {
    ConsentService.grant.mockResolvedValue({ _id: 'cons-1', scope: 'share_certificate_with_partner', partnerId: 'p1', status: 'active', expiresAt: null });
    const res = await request(app).post('/api/dogs/dog-1/consent').send({ scope: 'share_certificate_with_partner' });
    expect(res.status).toBe(201);
    expect(res.body.scope).toBe('share_certificate_with_partner');
  });

  it('POST /certificate/share SIN consentimiento → 403 NO_CONSENT', async () => {
    CertificateService.getActive.mockResolvedValue(CERT);
    ConsentService.hasConsent.mockResolvedValue(false);
    const res = await request(app).post('/api/dogs/dog-1/certificate/share').send({ partnerId: 'p1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NO_CONSENT');
    expect(WebhookService.deliver).not.toHaveBeenCalled();
  });

  it('POST /certificate/share con consentimiento → comparte nivel y dispara webhook', async () => {
    CertificateService.getActive.mockResolvedValue(CERT);
    ConsentService.hasConsent.mockResolvedValue(true);
    CertificateService.shareableView.mockReturnValue({ confidenceLevel: 'certified', validUntil: CERT.validUntil, certifiedBy: 'Clínica Palermo', attestedCount: 2 });
    Partner.findById.mockReturnValue({ select: () => Promise.resolve({ webhookUrl: 'https://partner.test/hook' }) });
    WebhookService.deliver.mockResolvedValue({ ok: true, attempts: 1 });

    const res = await request(app).post('/api/dogs/dog-1/certificate/share').send({ partnerId: 'p1' });
    expect(res.status).toBe(200);
    expect(res.body.shared).toBe(true);
    expect(WebhookService.deliver).toHaveBeenCalledWith('https://partner.test/hook', expect.objectContaining({ event: 'certificate.shared' }));
    // El payload compartido NO incluye el score numérico.
    expect(res.body.certificate).not.toHaveProperty('score');
  });
});
