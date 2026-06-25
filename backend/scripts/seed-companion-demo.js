'use strict';

/**
 * Seed de DEMO de la capa Companion (B2B2C). Idempotente y namespaced: solo toca
 * registros marcados como demo (slug `aseguradora-demo`, emails `@companion-demo.test`,
 * clínica `clinica-demo`). Re-ejecutarlo limpia los anteriores y recrea.
 *
 *   cd backend && node scripts/seed-companion-demo.js
 *   node scripts/seed-companion-demo.js --clean   # solo limpia, no recrea
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Partner = require('../src/models/Partner');
const User = require('../src/models/User');
const Clinic = require('../src/models/Clinic');
const VetAttestation = require('../src/models/VetAttestation');
const PetScoreCertificate = require('../src/models/PetScoreCertificate');
const Consent = require('../src/models/Consent');
const InsurancePolicy = require('../src/models/InsurancePolicy');
const Claim = require('../src/models/Claim');
const InsuranceLead = require('../src/models/InsuranceLead');
const UsageRecord = require('../src/models/UsageRecord');
const BillingRecord = require('../src/models/BillingRecord');
const PartnerEvent = require('../src/models/PartnerEvent');
const AuditLog = require('../src/models/AuditLog');
const { generateApiKey, hashApiKey } = require('../src/services/apiKey');

const SLUG = 'aseguradora-demo';
const CLINIC_SLUG = 'clinica-demo';
const EMAIL_RE = /@companion-demo\.test$/;
const PASSWORD = 'demo1234';
// API key fija de demo (para poder mostrarla y probar la API v1).
const DEMO_API_KEY = 'mp_demo_companion_key_0001';
const WEBHOOK_URL = 'https://httpbin.org/post'; // responde 200 → prueba la entrega

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);
// El índice unique de referralCode no es sparse en esta DB → asignamos uno único.
const refCode = () => `DEMO-${require('crypto').randomBytes(3).toString('hex').toUpperCase()}`;

async function clean() {
  const oldPartner = await Partner.findOne({ slug: SLUG });
  const oldUsers = await User.find({ email: EMAIL_RE }).select('_id dogs');
  const oldUserIds = oldUsers.map((u) => u._id);
  const oldDogIds = oldUsers.flatMap((u) => (u.dogs || []).map((d) => d._id));

  if (oldPartner) {
    await UsageRecord.deleteMany({ partnerId: oldPartner._id });
    await BillingRecord.deleteMany({ partnerId: oldPartner._id });
    await PartnerEvent.deleteMany({ partnerId: oldPartner._id });
  }
  await VetAttestation.deleteMany({ dogId: { $in: oldDogIds } });
  await PetScoreCertificate.deleteMany({ dogId: { $in: oldDogIds } });
  await Consent.deleteMany({ dogId: { $in: oldDogIds } });
  await InsurancePolicy.deleteMany({ dogId: { $in: oldDogIds } });
  await Claim.deleteMany({ dogId: { $in: oldDogIds } });
  await InsuranceLead.deleteMany({ userId: { $in: oldUserIds } });
  await AuditLog.deleteMany({ userId: { $in: oldUserIds } });
  await Clinic.deleteMany({ slug: CLINIC_SLUG });
  if (oldPartner) await Partner.deleteOne({ _id: oldPartner._id });
  await User.deleteMany({ _id: { $in: oldUserIds } });
  console.log(`[clean] partner:${oldPartner ? 1 : 0} users:${oldUserIds.length} dogs:${oldDogIds.length}`);
}

async function makeTutor({ name, email, dog }) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await User.create({ name, email, passwordHash, referralCode: refCode(), dogs: [dog] });
  return { user, dog: user.dogs[0] };
}

async function seed() {
  // ── Partner (aseguradora) con contrato + cobro automático + API key ──
  const partner = await Partner.create({
    name: 'Aseguradora Demo',
    slug: SLUG,
    type: 'insurer',
    branding: { appName: 'PetSeguro', logoUrl: null, primaryColor: '#e4002b', secondaryColor: '#a30020' },
    contract: { setupFee: 1000, pricePerActivePet: 50, currency: 'UYU', billingDay: 1 },
    billing: { autoCharge: true, provider: 'mercadopago', paymentToken: 'DEMO_CARD_TOKEN', payerEmail: 'pagos@companion-demo.test' },
    features: ['insurance', 'certificate'],
    apiKeyHash: hashApiKey(DEMO_API_KEY),
    webhookUrl: WEBHOOK_URL,
    status: 'active',
  });

  // ── Clínica aliada vinculada al partner ──
  const clinic = await Clinic.create({
    name: 'Clínica Demo', slug: CLINIC_SLUG, partnerId: partner._id,
    country: 'UY', city: 'Montevideo', incentivePremiumDays: 30, active: true,
  });

  // ── partner_admin ──
  const partnerAdmin = await User.create({
    name: 'Admin Aseguradora', email: 'partner-admin@companion-demo.test',
    passwordHash: await bcrypt.hash(PASSWORD, 12), role: 'partner_admin', partnerId: partner._id, referralCode: refCode(),
  });

  // ── Tutores + perros atribuidos al partner ──
  // Luna: patrocinada, vacunas/desparasitación al día (activa + al día).
  const luna = await makeTutor({
    name: 'Ana López', email: 'ana@companion-demo.test',
    dog: {
      name: 'Luna', breed: 'Labrador', dateOfBirth: new Date('2022-03-01'),
      countryProfile: 'UY', sex: 'female', weightKg: 28, photoUrl: null,
      partnerId: partner._id, sponsorshipStatus: 'sponsored',
      vaccinations: [{ vaccineName: 'Rabia', dateAdministered: daysAgo(5), nextDueDate: daysAhead(360), status: 'completed' }],
      dewormingHistory: [{ productName: 'Drontal', dateAdministered: daysAgo(10), nextDueDate: daysAhead(80), status: 'completed' }],
    },
  });
  // Toby: activo por un síntoma reciente, sin atestación.
  const toby = await makeTutor({
    name: 'Beto Ruiz', email: 'beto@companion-demo.test',
    dog: {
      name: 'Toby', breed: 'Beagle', dateOfBirth: new Date('2021-07-15'), countryProfile: 'UY',
      partnerId: partner._id, sponsorshipStatus: 'none',
      symptoms: [{ description: 'Cojera leve pata trasera', severity: 'mild', dateObserved: daysAgo(3) }],
    },
  });
  // Rocky: atribuido pero SIN eventos registrados → inactivo este mes.
  // (Si tuviera cualquier subdoc, su createdAt de hoy lo haría "activo": registrar
  // en la app cuenta como actividad. Por eso queda sin historial cargado.)
  const rocky = await makeTutor({
    name: 'Caro Díaz', email: 'caro@companion-demo.test',
    dog: {
      name: 'Rocky', breed: 'Bulldog', dateOfBirth: new Date('2020-01-10'), countryProfile: 'UY',
      partnerId: partner._id, sponsorshipStatus: 'none',
    },
  });

  // ── Atestación veterinaria sobre la vacuna de Luna (clínica identificada → certified) ──
  const lunaVax = luna.dog.vaccinations[0];
  await VetAttestation.create({
    ownerUserId: luna.user._id, dogId: luna.dog._id, kind: 'vaccination', itemId: lunaVax._id,
    label: 'Rabia', vetUserId: null, clinicId: clinic._id, clinicName: clinic.name,
    source: 'vet_account', attestedAt: daysAgo(4), expiresAt: daysAhead(360), status: 'active',
  });

  // ── Póliza de Luna (para coverage-check) ──
  await InsurancePolicy.create({
    dogId: luna.dog._id, ownerUserId: luna.user._id, partnerId: partner._id,
    policyNumber: 'POL-DEMO-001', productName: 'Plan Total', reimbursementModel: 'reimbursement',
    startDate: daysAgo(120), status: 'active',
    coverage: [
      { item: 'accidente', covered: true, limit: 50000, currency: 'UYU', carenciaDays: 0 },
      { item: 'cirugia', covered: true, limit: 100000, currency: 'UYU', carenciaDays: 60 },
      { item: 'estetica', covered: false, carenciaDays: 0 },
    ],
  });

  // ── Consentimiento de Luna para compartir el certificado con el partner ──
  await Consent.create({
    ownerUserId: luna.user._id, dogId: luna.dog._id,
    scope: 'share_certificate_with_partner', partnerId: partner._id, status: 'active',
  });

  return { partner, clinic, partnerAdmin, luna, toby, rocky };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida en .env');
  await mongoose.connect(uri);

  await clean();
  if (process.argv.includes('--clean')) {
    console.log('[clean-only] listo.');
    await mongoose.disconnect();
    return;
  }

  const { partner, partnerAdmin, luna, toby, rocky } = await seed();

  console.log('\n=== SEED COMPANION DEMO ===');
  console.log('Partner:        ', partner.name, '| slug:', partner.slug, '| id:', String(partner._id));
  console.log('API key (demo):  ', DEMO_API_KEY);
  console.log('Webhook URL:     ', partner.webhookUrl);
  console.log('partner_admin:   ', partnerAdmin.email, '/', PASSWORD, '| /partner');
  console.log('Tutores (pass demo1234):');
  console.log('  Ana  (Luna)  dogId:', String(luna.dog._id), '— patrocinada, al día, atestada, con póliza + consentimiento');
  console.log('  Beto (Toby)  dogId:', String(toby.dog._id), '— activo por síntoma');
  console.log('  Caro (Rocky) dogId:', String(rocky.dog._id), '— inactivo este mes');
  console.log('\nProbar:  node scripts/verify-companion-demo.js');
  console.log('Limpiar: node scripts/seed-companion-demo.js --clean\n');

  await mongoose.disconnect();
}

main().catch((err) => { console.error('[seed] failed:', err); mongoose.disconnect(); process.exit(1); });
