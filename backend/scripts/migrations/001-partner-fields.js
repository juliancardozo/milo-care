'use strict';

/**
 * Migración 001 — Campos B2B2C "Companion" (idempotente).
 *
 * Backfillea los defaults nullable de la capa Partner sobre documentos existentes:
 *   - User.partnerId            → null   (donde falte)
 *   - User.dogs[].partnerId     → null   (donde falte)
 *   - User.dogs[].sponsorshipStatus → 'none' (donde falte)
 *   - Clinic.partnerId          → null   (donde falte)
 *
 * NO toca ningún otro dato. Es 100% idempotente: solo actualiza documentos a los
 * que les falta el campo, así que correrla N veces es seguro. Un usuario/perro sin
 * partner sigue funcionando exactamente igual que antes.
 *
 * Usage:
 *   cd backend && node scripts/migrations/001-partner-fields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida en .env');

  await mongoose.connect(uri);
  const db = mongoose.connection;

  // Usamos updates crudos por colección para no disparar validación/hooks y mantener
  // la migración barata e idempotente.

  const users = db.collection('users');
  const usrPartner = await users.updateMany(
    { partnerId: { $exists: false } },
    { $set: { partnerId: null } },
  );
  const dogPartner = await users.updateMany(
    { 'dogs.partnerId': { $exists: false }, 'dogs.0': { $exists: true } },
    { $set: { 'dogs.$[d].partnerId': null } },
    { arrayFilters: [{ 'd.partnerId': { $exists: false } }] },
  );
  const dogSponsor = await users.updateMany(
    { 'dogs.sponsorshipStatus': { $exists: false }, 'dogs.0': { $exists: true } },
    { $set: { 'dogs.$[d].sponsorshipStatus': 'none' } },
    { arrayFilters: [{ 'd.sponsorshipStatus': { $exists: false } }] },
  );

  const clinics = db.collection('clinics');
  const clinicPartner = await clinics.updateMany(
    { partnerId: { $exists: false } },
    { $set: { partnerId: null } },
  );

  console.log('[migration 001] users.partnerId        →', usrPartner.modifiedCount, 'docs');
  console.log('[migration 001] dogs.partnerId         →', dogPartner.modifiedCount, 'docs');
  console.log('[migration 001] dogs.sponsorshipStatus →', dogSponsor.modifiedCount, 'docs');
  console.log('[migration 001] clinics.partnerId      →', clinicPartner.modifiedCount, 'docs');

  await mongoose.disconnect();
  console.log('[migration 001] done.');
}

main().catch((err) => {
  console.error('[migration 001] failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
