'use strict';

/**
 * Motor de cuidado preventivo PROACTIVO: dado un evento aplicado (vacuna o
 * antiparasitario), calcula cuándo toca el próximo, con la cadencia clínica
 * correcta por catálogo / producto / etapa de vida.
 *
 * Todo es advisory: cada salida incluye una nota y, cuando corresponde, marca
 * requiresVetValidation. Fuentes: WSAVA 2022, SENASA (AR), MGAP (UY).
 */

const vaccinationRules = require('../config/vaccinationRules');
const { getVaccineById } = require('../config/vaccineCatalog');
const { resolveExternalProduct } = require('../config/antiparasiticCatalog');
const { dewormingCadenceDays } = require('../config/riskProfiles');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── Vacunas (Fase A) ─────────────────────────────────────────────────────────

// nombre libre del usuario → id del catálogo
const VACCINE_KEYWORDS = [
  { id: 'rabia', kws: ['rabia', 'rabica', 'rabies', 'antirrabica'] },
  { id: 'octuple', kws: ['octuple'] },
  { id: 'sextuple', kws: ['sextuple'] },
  { id: 'quintuple', kws: ['quintuple'] },
  { id: 'triple_core', kws: ['triple'] },
  { id: 'leptospira', kws: ['leptospira', 'lepto'] },
  { id: 'bordetella', kws: ['bordetella', 'traqueobronquitis', 'tos de perreras', 'kennel'] },
  { id: 'gardia', kws: ['giardia', 'gardia'] },
];

function matchVaccineId(vaccineName) {
  const n = normalize(vaccineName);
  for (const entry of VACCINE_KEYWORDS) {
    if (entry.kws.some((kw) => n.includes(normalize(kw)))) return entry.id;
  }
  return null;
}

const SERIES_VACCINE_IDS = new Set(['triple_core', 'quintuple', 'sextuple', 'octuple', 'leptospira']);

/**
 * Próxima fecha de vacuna a partir de una dosis aplicada.
 * @returns {{ dueDate: Date, intervalLabel: string, note: string, catalogId: string, requiresVetValidation: boolean } | null}
 */
function nextVaccineDueDate({ vaccineName, fromDate = new Date(), country = 'AR', ageMonths = null }) {
  const catalogId = matchVaccineId(vaccineName);
  if (!catalogId) return null; // no la conocemos: no inventamos cadencia

  const region = vaccinationRules[String(country).toUpperCase()] || vaccinationRules.AR;
  const base = new Date(fromDate);

  // Rabia: cadencia regulatoria del país (anual en AR/UY).
  if (catalogId === 'rabia') {
    const months = region.rabies?.intervalMonths || 12;
    return {
      dueDate: addMonths(base, months),
      intervalLabel: 'anual',
      catalogId,
      requiresVetValidation: false,
      note: region.rabies?.note || 'Revacunación antirrábica anual.',
    };
  }

  // Cachorro aún en serie inicial: próxima dosis a las ~3 semanas.
  const inPuppySeries = SERIES_VACCINE_IDS.has(catalogId) && ageMonths !== null && ageMonths < 4;
  if (inPuppySeries) {
    return {
      dueDate: addDays(base, 21),
      intervalLabel: 'serie cachorro',
      catalogId,
      requiresVetValidation: true,
      note: 'Próxima dosis de la serie de cachorro (cada 2–4 semanas, la última a las 16 semanas o más). Confirmá con tu veterinario.',
    };
  }

  // Adulto: intervalo del catálogo (core 3 años; lepto/combinadas 1 año).
  const entry = getVaccineById(catalogId);
  const intervalYears = entry?.schedule?.adult?.intervalYears || 1;
  return {
    dueDate: addMonths(base, intervalYears * 12),
    intervalLabel: intervalYears >= 2 ? `cada ${intervalYears} años` : 'anual',
    catalogId,
    requiresVetValidation: false,
    note: entry?.schedule?.adult?.notes || 'Refuerzo según el intervalo recomendado para esta vacuna.',
  };
}

// ── Desparasitación interna por etapa (Fase C) ───────────────────────────────

/**
 * Intervalo (días) de desparasitación INTERNA según etapa de vida y riesgo.
 *  - Cachorro 2–12 sem (≈ <3 meses): cada 14 días
 *  - Cachorro 3–6 meses: mensual
 *  - Adulto: trimestral (riesgo bajo) → mensual (riesgo alto)
 */
function internalDewormingIntervalDays(ageMonths = null, riskLevel = 'low') {
  if (ageMonths !== null && ageMonths < 3) return 14;
  if (ageMonths !== null && ageMonths < 6) return 30;
  return dewormingCadenceDays[riskLevel] || dewormingCadenceDays.low; // low 90, medium 60, high 30
}

// ── Antiparasitarios (interno por etapa + externo por producto) (Fases B+C) ──

/**
 * Próxima desparasitación a partir de una aplicación.
 * Externo/both con producto conocido → intervalo del producto.
 * Interno → cadencia por etapa/riesgo.
 * @returns {{ dueDate: Date, intervalDays: number, note: string, basis: string }}
 */
function nextDewormingDueDate({
  productName = '',
  parasiteType = 'internal',
  fromDate = new Date(),
  ageMonths = null,
  riskLevel = 'low',
}) {
  const base = new Date(fromDate);
  const type = String(parasiteType || 'internal').toLowerCase();

  if (type === 'external' || type === 'both') {
    const product = resolveExternalProduct(productName);
    return {
      dueDate: addDays(base, product.intervalDays),
      intervalDays: product.intervalDays,
      basis: `external:${product.id}`,
      note: `Re-aplicar ${product.label.toLowerCase()} (cada ${product.intervalDays} días). Verificá el prospecto del producto.`,
    };
  }

  const intervalDays = internalDewormingIntervalDays(ageMonths, riskLevel);
  return {
    dueDate: addDays(base, intervalDays),
    intervalDays,
    basis: 'internal:stage',
    note: `Desparasitación interna cada ${intervalDays} días según la etapa de vida y el riesgo. Consultá con tu veterinario.`,
  };
}

module.exports = {
  matchVaccineId,
  nextVaccineDueDate,
  internalDewormingIntervalDays,
  nextDewormingDueDate,
};
