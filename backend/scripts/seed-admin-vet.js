'use strict';

/**
 * Crea/actualiza el usuario adminVet del piloto del Kit de Activación Veterinaria.
 * El rol 'adminVet' tiene todas las funcionalidades de admin + gestión de clínicas.
 *
 * Si el email ya existe, lo promueve a adminVet y resetea la contraseña.
 *
 * Usage:
 *   cd backend && node scripts/seed-admin-vet.js
 *   ADMIN_VET_EMAIL=otro@mail.com ADMIN_VET_PASSWORD=secreto123 node scripts/seed-admin-vet.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const referralService = require('../src/services/referralService');

const EMAIL = (process.env.ADMIN_VET_EMAIL || 'julian.cardozo.viggiano@gmail.com').toLowerCase();
const PASSWORD = process.env.ADMIN_VET_PASSWORD;
const NAME = process.env.ADMIN_VET_NAME || 'Julián (adminVet)';
const SALT_ROUNDS = 12;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida en .env');
  if (!PASSWORD) throw new Error('ADMIN_VET_PASSWORD es obligatoria (ej: ADMIN_VET_PASSWORD=... node scripts/seed-admin-vet.js).');
  if (PASSWORD.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

  await mongoose.connect(uri);
  console.log('✓ Conectado a MongoDB');

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  let user = await User.findOne({ email: EMAIL });

  if (user) {
    user.role = 'adminVet';
    user.passwordHash = passwordHash;
    await referralService.ensureUserHasCode(user);
    await user.save();
    console.log(`✓ Usuario existente promovido a adminVet: ${user.email}`);
  } else {
    user = await User.create({
      name: NAME,
      email: EMAIL,
      passwordHash,
      role: 'adminVet',
      referralCode: await referralService.generateUniqueCode(),
    });
    console.log(`✓ Usuario adminVet creado: ${user.email}`);
  }

  console.log(`  rol:   ${user.role}`);
  console.log(`  email: ${user.email}`);
  await mongoose.disconnect();
  console.log('✓ Listo.');
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
