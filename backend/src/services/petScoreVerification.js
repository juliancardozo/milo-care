'use strict';

/**
 * petScoreVerification — deriva el SELLO de confianza que se muestra encima del
 * Health Score, a partir de las atestaciones del perro. Función pura y testeable:
 * recibe el array de atestaciones (POJOs) y `now`, sin tocar la DB.
 *
 * Niveles:
 *   - 'self'      → sin atestaciones activas (auto-reportado, estado por defecto).
 *   - 'verified'  → hay atestaciones activas, ninguna con clínica identificada.
 *   - 'certified' → al menos una atestación activa de un vet con clínica identificada.
 *
 * El sello NO cambia el número del Health Score: es metadata de confianza.
 */

const LEVEL_LABELS = {
  self: 'Auto-reportado',
  verified: 'Verificado por veterinario',
  certified: 'Certificado por clínica',
};

function isActive(att, now) {
  if (att.status !== 'active') return false;
  if (att.expiresAt && new Date(att.expiresAt) <= now) return false;
  return true;
}

function deriveVerification(attestations = [], now = new Date()) {
  const active = attestations.filter((a) => isActive(a, now));

  if (active.length === 0) {
    return {
      level: 'self',
      label: LEVEL_LABELS.self,
      attestedItems: [],
      certifiedBy: null,
      attestedAt: null,
      validUntil: null,
    };
  }

  const certified = active.filter((a) => a.clinicId);
  const level = certified.length > 0 ? 'certified' : 'verified';
  const pool = certified.length > 0 ? certified : active;

  const mostRecent = [...pool].sort((a, b) => new Date(b.attestedAt) - new Date(a.attestedAt))[0];
  const certifiedBy = level === 'certified' ? (mostRecent.clinicName || null) : null;

  // Vigencia del sello = la atestación activa que vence primero.
  const validUntil = active.reduce((min, a) => {
    if (!a.expiresAt) return min;
    if (!min || new Date(a.expiresAt) < new Date(min)) return a.expiresAt;
    return min;
  }, null);

  const attestedItems = active.map((a) => ({
    kind: a.kind,
    itemId: a.itemId,
    label: a.label || null,
    attestedAt: a.attestedAt,
    clinicName: a.clinicName || null,
    source: a.source,
  }));

  return {
    level,
    label: LEVEL_LABELS[level],
    attestedItems,
    certifiedBy,
    attestedAt: mostRecent.attestedAt || null,
    validUntil,
  };
}

module.exports = { deriveVerification, LEVEL_LABELS };
