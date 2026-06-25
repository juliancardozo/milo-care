'use strict';

const VetAttestation = require('../models/VetAttestation');
const Clinic = require('../models/Clinic');
const AuditService = require('./AuditService');

/**
 * AttestationService — núcleo compartido para firmar atestaciones discretas del
 * vet sobre un ítem del expediente (vacuna/desparasitación). Lo usan tanto el
 * flujo público por link (`vetShare`) como el panel autenticado (`vetPortal`).
 *
 * Identidad del certificador:
 *   - `ANONYMOUS`        → atestación por link sin login → sello 'verified'.
 *   - `certifierForVet`  → vet logueado + su clínica     → sello 'certified'.
 */
const ANONYMOUS = Object.freeze({ vetUserId: null, clinicId: null, clinicName: null, source: 'token' });

async function certifierForVet(vetUserId) {
  if (!vetUserId) return { ...ANONYMOUS };
  const clinic = await Clinic.findOne({ ownerVetUserId: vetUserId }).select('name');
  return { vetUserId, clinicId: clinic?._id || null, clinicName: clinic?.name || null, source: 'vet_account' };
}

/**
 * Atesta (valida) un ítem del perro: setea `vetValidatedAt`, crea/refresca la
 * `VetAttestation` activa de ese ítem y registra el `AuditLog`. Persiste vía
 * `ownerUser.save()` (el perro vive embebido en el dueño).
 *
 * @returns {Promise<{ item, expiresAt, certifier } | null>} null si el ítem no existe.
 */
async function attestItem({ ownerUser, dog, kind, itemId, certifier = ANONYMOUS, now = new Date() }) {
  const collection = kind === 'vaccination' ? dog.vaccinations : dog.dewormingHistory;
  if (!collection) return null;
  const item = collection.id(itemId);
  if (!item) return null;

  item.requiresVetValidation = false;
  item.vetValidatedAt = now;
  if (item.status === 'pending_vet_validation') item.status = 'completed';
  await ownerUser.save();

  const label = kind === 'vaccination' ? item.vaccineName : item.productName;
  const expiresAt = item.nextDueDate
    ? new Date(item.nextDueDate)
    : new Date(now.getTime() + 365 * 86400000);

  await VetAttestation.findOneAndUpdate(
    { dogId: dog._id, kind, itemId: item._id, status: 'active' },
    {
      $set: {
        ownerUserId: ownerUser._id,
        dogId: dog._id,
        kind,
        itemId: item._id,
        label,
        attestedAt: now,
        expiresAt,
        status: 'active',
        ...certifier,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  AuditService.record({
    userId: ownerUser._id,
    action: 'attestation_signed',
    meta: {
      dogId: String(dog._id),
      kind,
      itemId: String(item._id),
      source: certifier.source,
      clinicId: certifier.clinicId ? String(certifier.clinicId) : null,
    },
  });

  return { item, expiresAt, certifier };
}

module.exports = { ANONYMOUS, certifierForVet, attestItem };
