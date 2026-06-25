'use strict';

const request = require('supertest');

// El flag debe estar ON antes de requerir app.js (las rutas de partner se montan
// condicionalmente). Las rutas de export/share NO dependen del flag.
process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Auth simulado: usuario autenticado. adminAuth real exige role admin; lo simulamos
// también para el POST /partners (no es el foco de este contrato).
jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', role: 'admin' };
  next();
});

jest.mock('../../src/models/Partner', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../../src/services/DogAccess', () => ({ loadForRequest: jest.fn() }));
jest.mock('../../src/services/PdfService', () => ({ generateDogHealthPdf: jest.fn() }));

const Partner = require('../../src/models/Partner');
const DogAccess = require('../../src/services/DogAccess');
const PdfService = require('../../src/services/PdfService');
const app = require('../../src/app');

const selectMock = (value) => ({ select: jest.fn().mockResolvedValue(value) });

describe('Contract: Companion (white-label theme + export/share)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/public/partners/by-slug/:slug/theme', () => {
    it('devuelve branding del partner activo', async () => {
      Partner.findOne.mockReturnValue(
        selectMock({ slug: 'acme', type: 'insurer', name: 'Acme', branding: { appName: 'Acme Pets', primaryColor: '#ff0000' } }),
      );

      const res = await request(app).get('/api/public/partners/by-slug/acme/theme');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('acme');
      expect(res.body.branding.appName).toBe('Acme Pets');
      expect(res.body.branding.primaryColor).toBe('#ff0000');
    });

    it('404 cuando el partner no existe o está pausado', async () => {
      Partner.findOne.mockReturnValue(selectMock(null));
      const res = await request(app).get('/api/public/partners/by-slug/nope/theme');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/dogs/:dogId/export.pdf', () => {
    it('403 UPGRADE_REQUIRED para tutor free con perro no patrocinado', async () => {
      DogAccess.loadForRequest.mockResolvedValue({
        owner: { tier: 'free', premiumUntil: null },
        dog: { _id: 'dog-1', name: 'Luna', sponsorshipStatus: 'none', partnerId: null },
        role: 'owner',
      });

      const res = await request(app).get('/api/dogs/dog-1/export.pdf');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UPGRADE_REQUIRED');
      expect(PdfService.generateDogHealthPdf).not.toHaveBeenCalled();
    });

    it('200 application/pdf para tutor premium', async () => {
      DogAccess.loadForRequest.mockResolvedValue({
        owner: { tier: 'premium', premiumUntil: null },
        dog: { _id: 'dog-1', name: 'Luna', sponsorshipStatus: 'none', partnerId: null },
        role: 'owner',
      });
      PdfService.generateDogHealthPdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));

      const res = await request(app).get('/api/dogs/dog-1/export.pdf');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(PdfService.generateDogHealthPdf).toHaveBeenCalled();
    });
  });

  describe('POST /api/dogs/:dogId/share/whatsapp', () => {
    it('200 con link wa.me para perro patrocinado (tutor free)', async () => {
      DogAccess.loadForRequest.mockResolvedValue({
        owner: { tier: 'free', premiumUntil: null },
        dog: { _id: 'dog-1', name: 'Luna', breed: 'Mestizo', sponsorshipStatus: 'sponsored', partnerId: null },
        role: 'owner',
      });

      const res = await request(app).post('/api/dogs/dog-1/share/whatsapp').send({});
      expect(res.status).toBe(200);
      expect(res.body.link).toContain('wa.me');
      expect(res.body.text).toContain('Luna');
    });
  });
});
