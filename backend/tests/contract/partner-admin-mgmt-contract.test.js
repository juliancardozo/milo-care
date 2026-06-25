'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => { req.user = { id: 'admin-1', role: 'admin' }; next(); });
jest.mock('../../src/models/Partner', () => ({ find: jest.fn(), findById: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/User', () => ({ findById: jest.fn(), findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/MagicLoginToken', () => ({ deleteMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) }));
jest.mock('../../src/services/EmailService', () => ({ sendPartnerAdminInvite: jest.fn().mockResolvedValue() }));
jest.mock('../../src/services/referralService', () => ({ generateUniqueCode: jest.fn().mockResolvedValue('DEMO-XYZ') }));

const Partner = require('../../src/models/Partner');
const User = require('../../src/models/User');
const EmailService = require('../../src/services/EmailService');
const app = require('../../src/app');

function mkPartner(over = {}) {
  const p = { _id: 'p1', name: 'Acme', slug: 'acme', type: 'insurer', branding: {}, contract: {}, billing: {}, features: [], webhookUrl: null, apiKeyHash: 'h', status: 'active', createdAt: new Date(), updatedAt: new Date(), ...over };
  p.toObject = () => ({ ...p });
  p.save = jest.fn().mockResolvedValue(true);
  return p;
}
function mkUser(over = {}) {
  const u = { _id: 'u1', name: 'Ana', email: 'a@b.com', tier: 'free', role: 'user', partnerId: null, ...over };
  u.save = jest.fn().mockResolvedValue(true);
  return u;
}

describe('Contract: gestión de partners (admin) + asignar partner_admin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/partners lista los partners (sin hash de key)', async () => {
    Partner.find.mockReturnValue({ sort: () => Promise.resolve([mkPartner()]) });
    const res = await request(app).get('/api/partners');
    expect(res.status).toBe(200);
    expect(res.body.partners).toHaveLength(1);
    expect(res.body.partners[0]).not.toHaveProperty('apiKeyHash');
    expect(res.body.partners[0].hasApiKey).toBe(true);
  });

  it('PATCH /api/partners/:id edita campos', async () => {
    Partner.findById.mockResolvedValue(mkPartner());
    const res = await request(app).patch('/api/partners/p1').send({ name: 'Acme Seguros', contract: { pricePerActivePet: 80 } });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Acme Seguros');
    expect(res.body.contract.pricePerActivePet).toBe(80);
  });

  it('POST /api/partners/:id/api-key/rotate devuelve una nueva key', async () => {
    Partner.findById.mockResolvedValue(mkPartner());
    const res = await request(app).post('/api/partners/p1/api-key/rotate');
    expect(res.status).toBe(200);
    expect(res.body.apiKey).toMatch(/^mp_/);
  });

  describe('PATCH /api/admin/users/:id — asignar partner_admin', () => {
    it('asigna role partner_admin + partnerId válido', async () => {
      User.findById.mockResolvedValue(mkUser());
      Partner.findById.mockReturnValue({ select: () => Promise.resolve({ _id: 'p1' }) });
      const res = await request(app).patch('/api/admin/users/u1').send({ role: 'partner_admin', partnerId: 'p1' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('partner_admin');
      expect(String(res.body.partnerId)).toBe('p1');
    });

    it('partner_admin sin partnerId → 400', async () => {
      User.findById.mockResolvedValue(mkUser());
      const res = await request(app).patch('/api/admin/users/u1').send({ role: 'partner_admin' });
      expect(res.status).toBe(400);
    });

    it('partnerId inexistente → 400', async () => {
      User.findById.mockResolvedValue(mkUser());
      Partner.findById.mockReturnValue({ select: () => Promise.resolve(null) });
      const res = await request(app).patch('/api/admin/users/u1').send({ partnerId: 'nope' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/partners/:id/invite — invitar partner_admin por email', () => {
    it('email nuevo → crea usuario partner_admin + manda magic link', async () => {
      Partner.findById.mockResolvedValue(mkPartner());
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'newu', email: 'nuevo@aseg.com', name: 'nuevo', role: 'partner_admin' });

      const res = await request(app).post('/api/partners/p1/invite').send({ email: 'nuevo@aseg.com' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('partner_admin');
      expect(res.body.emailed).toBe(true);
      expect(EmailService.sendPartnerAdminInvite).toHaveBeenCalled();
      expect(res.body).not.toHaveProperty('magicUrl'); // no se filtra el token si el email salió
    });

    it('usuario existente → lo vincula como partner_admin', async () => {
      Partner.findById.mockResolvedValue(mkPartner());
      User.findOne.mockResolvedValue(mkUser({ role: 'user' }));
      const res = await request(app).post('/api/partners/p1/invite').send({ email: 'a@b.com' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('partner_admin');
      expect(String(res.body.partnerId)).toBe('p1');
    });

    it('email inválido → 400', async () => {
      const res = await request(app).post('/api/partners/p1/invite').send({ email: 'no-es-email' });
      expect(res.status).toBe(400);
    });

    it('partner inexistente → 404', async () => {
      Partner.findById.mockResolvedValue(null);
      const res = await request(app).post('/api/partners/zzz/invite').send({ email: 'x@y.com' });
      expect(res.status).toBe(404);
    });

    it('si el email falla, devuelve el magicUrl para entrega manual', async () => {
      Partner.findById.mockResolvedValue(mkPartner());
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'newu', email: 'x@y.com', name: 'x', role: 'partner_admin' });
      EmailService.sendPartnerAdminInvite.mockRejectedValueOnce(new Error('no resend'));

      const res = await request(app).post('/api/partners/p1/invite').send({ email: 'x@y.com' });
      expect(res.status).toBe(201);
      expect(res.body.emailed).toBe(false);
      expect(res.body.magicUrl).toContain('/magic-login?token=');
      expect(res.body.magicUrl).toContain('next=/partner');
    });
  });
});
