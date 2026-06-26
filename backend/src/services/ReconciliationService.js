'use strict';

const InsuranceLead = require('../models/InsuranceLead');
const { monthRange } = require('./petActivity');

/**
 * ReconciliationService — conciliación de conversiones de leads (CPA).
 *
 * Las conversiones las **auto-reporta el partner** vía la API v1 (incentivo a
 * sub-reportar para pagar menos CPA). Esta conciliación contrasta lo que Milo Care
 * registró contra la **exportación mensual del partner** (su fuente de verdad de
 * pólizas emitidas), para detectar diferencias antes de facturar/settlement.
 *
 * Match por `policyRef` (referencia externa de la póliza), normalizado.
 */

function norm(ref) {
  return String(ref || '').trim().toLowerCase();
}

/**
 * Núcleo puro: compara las conversiones registradas por Milo con las reportadas
 * por el partner. No toca la DB → fácil de testear.
 *
 * @param {Array<{leadId, policyRef}>} miloConversions  conversiones registradas en Milo (en el mes).
 * @param {string[]} reportedRefs  policyRefs que el partner declara haber convertido (su export).
 * @param {{ pricePerConversion?: number, currency?: string }} contract
 */
function diffConversions(miloConversions = [], reportedRefs = [], contract = {}) {
  const price = contract.pricePerConversion || 0;
  const currency = contract.currency || 'USD';

  // Milo: separar las que tienen policyRef (conciliables) de las que no.
  const miloByRef = new Map();
  const unverifiable = []; // convertidas en Milo SIN policyRef → no se pueden cruzar
  miloConversions.forEach((c) => {
    const ref = norm(c.policyRef);
    if (ref) miloByRef.set(ref, String(c.leadId));
    else unverifiable.push(String(c.leadId));
  });

  // Partner: refs únicas y normalizadas.
  const partnerRefs = new Set(reportedRefs.map(norm).filter(Boolean));

  const matched = [];
  const unreportedByPartner = []; // Milo la registró, el partner no la lista (posible error u over-billing)
  miloByRef.forEach((leadId, ref) => {
    if (partnerRefs.has(ref)) matched.push({ ref, leadId });
    else unreportedByPartner.push({ ref, leadId });
  });

  // Partner la reporta pero Milo no tiene conversión → sub-reporte por API (money leak de CPA).
  const missingInMilo = [...partnerRefs].filter((ref) => !miloByRef.has(ref));

  const miloConvertedCount = miloConversions.length;
  const reportedCount = partnerRefs.size;
  // Settlement: CPA que correspondería según el partner vs. lo que Milo facturaría hoy.
  const cpaDeltaCount = reportedCount - miloConvertedCount;

  return {
    pricePerConversion: price,
    currency,
    summary: {
      miloConvertedCount,
      reportedCount,
      matchedCount: matched.length,
      missingInMiloCount: missingInMilo.length,
      unreportedByPartnerCount: unreportedByPartner.length,
      unverifiableCount: unverifiable.length,
      // > 0 → Milo sub-facturó CPA (el partner reportó más de lo registrado).
      cpaDeltaCount,
      cpaDeltaAmount: cpaDeltaCount * price,
    },
    matched,
    missingInMilo, // refs que el partner debería haber convertido por API y no lo hizo
    unreportedByPartner, // conversiones de Milo ausentes en el export del partner
    unverifiable, // conversiones de Milo sin policyRef para cruzar
  };
}

/**
 * Concilia un partner para un mes contra su export de policyRefs.
 *
 * @param {object} partner  documento Partner (usa contract.pricePerConversion/currency).
 * @param {string} month    'YYYY-MM'.
 * @param {string[]} reportedRefs  policyRefs declarados por el partner.
 */
async function reconcile(partner, month, reportedRefs = []) {
  const { start, end } = monthRange(month);
  const leads = await InsuranceLead.find({
    partnerId: partner._id,
    status: 'converted',
    convertedAt: { $gte: new Date(start), $lt: new Date(end) },
  }).select('_id externalPolicyRef convertedAt').lean();

  const miloConversions = leads.map((l) => ({ leadId: l._id, policyRef: l.externalPolicyRef }));
  const report = diffConversions(miloConversions, reportedRefs, partner.contract || {});

  return { partnerId: String(partner._id), month, ...report };
}

module.exports = { reconcile, diffConversions };
