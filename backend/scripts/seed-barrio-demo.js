'use strict';

/**
 * Seed de DEMO del canal "Barrios privados" (B2B2C).
 *
 * Simula el caso de uso completo para pitchear:
 *   - un partner de tipo `barrio` ("Barrio Los Robles"),
 *   - su administración (partner_admin) que entra al panel de cumplimiento,
 *   - ~14 propietarios con su perro atribuido al barrio (partnerId + partnerUnit),
 *     con estado antirrábica variado (al día / por vencer / vencido / sin registro)
 *     para que el semáforo del panel quede poblado y realista.
 *
 * Idempotente y namespaced: solo toca el slug `los-robles` y los emails
 * `@barrio-demo.test`. Re-ejecutarlo limpia lo anterior y recrea.
 *
 *   cd backend && node scripts/seed-barrio-demo.js
 *   node scripts/seed-barrio-demo.js --clean   # solo limpia
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Partner = require('../src/models/Partner');
const User = require('../src/models/User');

const SLUG = 'los-robles';
const EMAIL_RE = /@barrio-demo\.test$/;
const PASSWORD = 'demo1234';

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);
const refCode = () => `BRDEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

// Perfiles de estado antirrábica. `rabies` construye la vacuna que dispara cada
// color del semáforo (ver src/services/barrioCompliance.js).
const rabiesAlDia = () => [{ vaccineName: 'Antirrábica', dateAdministered: daysAgo(30), nextDueDate: daysAhead(335), status: 'completed' }];
const rabiesPorVencer = () => [{ vaccineName: 'Antirrábica', dateAdministered: daysAgo(345), nextDueDate: daysAhead(18), status: 'completed' }];
const rabiesVencido = () => [{ vaccineName: 'Antirrábica', dateAdministered: daysAgo(400), nextDueDate: daysAgo(35), status: 'completed' }];
// "Sin registro" antirrábica: puede tener otras vacunas cargadas, pero no la de rabia.
const rabiesSinRegistro = () => [{ vaccineName: 'Triple (DHPP)', dateAdministered: daysAgo(60), nextDueDate: daysAhead(300), status: 'completed' }];

// Distribución del barrio: 14 perros en 12 unidades (dos unidades con 2 perros).
const TUTORS = [
  { name: 'Ana López',      unit: 'Lote 12',  dog: { name: 'Luna',   breed: 'Labrador' },           rabies: rabiesAlDia },
  { name: 'Bruno Sosa',     unit: 'Lote 34',  dog: { name: 'Rocky',  breed: 'Golden Retriever' },   rabies: rabiesAlDia },
  { name: 'Carla Méndez',   unit: 'Lote 07',  dog: { name: 'Simba',  breed: 'Border Collie' },      rabies: rabiesAlDia },
  { name: 'Diego Paz',      unit: 'Lote 21',  dog: { name: 'Nala',   breed: 'Caniche' },            rabies: rabiesAlDia },
  { name: 'Elena Ruiz',     unit: 'Lote 45',  dog: { name: 'Thor',   breed: 'Ovejero Alemán' },     rabies: rabiesAlDia },
  { name: 'Facundo Gil',    unit: 'Lote 45',  dog: { name: 'Kira',   breed: 'Beagle' },             rabies: rabiesPorVencer }, // misma unidad
  { name: 'Gabriela Díaz',  unit: 'Lote 58',  dog: { name: 'Toby',   breed: 'Bulldog Francés' },    rabies: rabiesPorVencer },
  { name: 'Hernán Vega',    unit: 'Lote 63',  dog: { name: 'Zeus',   breed: 'Boxer' },              rabies: rabiesPorVencer },
  { name: 'Irene Costa',    unit: 'Lote 09',  dog: { name: 'Coco',   breed: 'Salchicha' },          rabies: rabiesVencido },
  { name: 'Julián Rossi',   unit: 'Lote 27',  dog: { name: 'Maya',   breed: 'Dálmata' },            rabies: rabiesVencido },
  { name: 'Karina Núñez',   unit: 'Lote 51',  dog: { name: 'Otto',   breed: 'Schnauzer' },          rabies: rabiesVencido },
  { name: 'Lucas Ferro',    unit: 'Lote 16',  dog: { name: 'Lola',   breed: 'Cocker' },             rabies: rabiesSinRegistro },
  { name: 'Marina Ponce',   unit: 'Lote 16',  dog: { name: 'Duna',   breed: 'Mestizo' },            rabies: rabiesSinRegistro }, // misma unidad
  { name: 'Nicolás Arce',   unit: 'Lote 72',  dog: { name: 'Bruno',  breed: 'Pastor Belga' },       rabies: rabiesSinRegistro },
];

async function clean() {
  const oldPartner = await Partner.findOne({ slug: SLUG });
  const oldUsers = await User.find({ email: EMAIL_RE }).select('_id');
  const oldUserIds = oldUsers.map((u) => u._id);
  if (oldPartner) await Partner.deleteOne({ _id: oldPartner._id });
  await User.deleteMany({ _id: { $in: oldUserIds } });
  console.log(`[clean] partner:${oldPartner ? 1 : 0} users:${oldUserIds.length}`);
}

async function seed() {
  const partner = await Partner.create({
    name: 'Barrio Los Robles',
    slug: SLUG,
    type: 'barrio',
    branding: { appName: 'Los Robles', logoUrl: null, primaryColor: '#166b4e', secondaryColor: '#0f4d38' },
    features: ['barrio_compliance'],
    status: 'active',
  });

  const partnerAdmin = await User.create({
    name: 'Administración Los Robles',
    email: 'admin@barrio-demo.test',
    passwordHash: await bcrypt.hash(PASSWORD, 12),
    role: 'partner_admin',
    partnerId: partner._id,
    referralCode: refCode(),
  });

  let i = 0;
  for (const t of TUTORS) {
    i += 1;
    const email = `${t.dog.name.toLowerCase()}${i}@barrio-demo.test`;
    await User.create({
      name: t.name,
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      referralCode: refCode(),
      dogs: [{
        name: t.dog.name,
        breed: t.dog.breed,
        dateOfBirth: daysAgo(365 * (2 + (i % 4))), // 2–5 años
        countryProfile: 'AR',
        partnerId: partner._id,
        partnerUnit: t.unit,
        vaccinations: t.rabies(),
      }],
    });
  }

  return { partner, partnerAdmin, tutorCount: TUTORS.length };
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

  const { partner, partnerAdmin, tutorCount } = await seed();

  console.log('\n=== SEED BARRIO DEMO ===');
  console.log('Partner:        ', partner.name, '| slug:', partner.slug, '| id:', String(partner._id));
  console.log('Administración: ', partnerAdmin.email, '/', PASSWORD, '→ entra en /partner (panel de cumplimiento)');
  console.log('Propietarios:   ', tutorCount, 'perros atribuidos al barrio (pass demo1234)');
  console.log('Ejemplos tutor: ', 'luna1@barrio-demo.test (al día) · coco9@barrio-demo.test (vencido)');
  console.log('Semáforo esperado: 5 al día · 3 por vencer · 3 vencido · 3 sin registro');
  console.log('\nLimpiar: node scripts/seed-barrio-demo.js --clean\n');

  await mongoose.disconnect();
}

main().catch((err) => { console.error('[seed] failed:', err); mongoose.disconnect(); process.exit(1); });
