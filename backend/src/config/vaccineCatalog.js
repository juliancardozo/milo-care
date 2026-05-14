'use strict';

/**
 * Catálogo de vacunas caninas basado en:
 *  - WSAVA Vaccination Guidelines 2022
 *  - SENASA (AR): obligatoriedad antirrábica y normativa sanitaria
 *  - MGAP (UY): normativa antirrábica y control de leptospirosis
 *
 * Grupos:
 *  core_mandatory  → exigida por ley/SENASA en el país indicado
 *  core            → WSAVA core, recomendada para todos los perros
 *  regional_core   → recomendada donde el riesgo lo justifica (endemia, exposición)
 *  elective        → para perros con factores de riesgo específicos
 */

const catalog = [
  // ── Obligatoria SENASA / MGAP ────────────────────────────────────────────
  {
    id: 'rabia',
    name: 'Antirrábica (Rabia)',
    shortName: 'Rabia',
    group: 'core_mandatory',
    antigens: ['Rabies virus'],
    senasaRequired: true,
    countries: ['AR', 'UY'],
    wsavaClassification: 'core',
    schedule: {
      puppy: { startWeeks: 12, notes: 'Primera dosis no antes de las 12 semanas' },
      firstBooster: { afterMonths: 12 },
      adult: { intervalYears: 1, notes: 'Según normativa provincial/departamental y prospecto del producto' },
    },
    notes: 'Obligatoria por normativa SENASA en Argentina y MGAP en Uruguay. La frecuencia puede variar por provincia/departamento.',
    route: ['SC', 'IM'],
  },

  // ── Core WSAVA — todos los perros ────────────────────────────────────────
  {
    id: 'triple_core',
    name: 'Triple (CDV + CAV-2 + CPV-2)',
    shortName: 'Triple',
    group: 'core',
    antigens: ['CDV', 'CAV-2', 'CPV-2'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'core',
    schedule: {
      puppy: {
        startWeeks: 6,
        intervalWeeks: [2, 4],
        endWeeks: 16,
        notes: 'Iniciar no antes de 6 semanas; repetir cada 2–4 semanas hasta las 16 semanas o más',
      },
      firstBooster: { afterMonths: 6, notes: 'Considerar revacunación alrededor de los 6 meses' },
      adult: { intervalYears: 3, notes: 'No más frecuentemente que cada 3 años una vez establecida la inmunidad' },
    },
    notes: 'Vacuna core para todos los perros según WSAVA. Puede combinarse con Leptospira (quíntuple) o Bordetella (óctuple).',
    route: ['SC', 'IM'],
  },
  {
    id: 'quintuple',
    name: 'Quíntuple (CDV + CAV-2 + CPV-2 + Leptospira)',
    shortName: 'Quíntuple',
    group: 'core',
    antigens: ['CDV', 'CAV-2', 'CPV-2', 'Leptospira spp.'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'core+regional',
    schedule: {
      puppy: {
        startWeeks: 8,
        intervalWeeks: [2, 4],
        endWeeks: 16,
        notes: 'La Leptospira puede iniciarse desde las 8 semanas; segunda dosis 2–4 semanas después',
      },
      firstBooster: { afterMonths: 6 },
      adult: { intervalYears: 1, notes: 'Componente Leptospira requiere refuerzo anual' },
    },
    notes: 'Combinación habitual en AR/UY. Revacunación anual por el componente Leptospira.',
    route: ['SC', 'IM'],
  },
  {
    id: 'sextuple',
    name: 'Séxtuple (CDV + CAV-2 + CPV-2 + PI + Leptospira × 2)',
    shortName: 'Séxtuple',
    group: 'core',
    antigens: ['CDV', 'CAV-2', 'CPV-2', 'PI', 'Leptospira spp.'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'core+regional',
    schedule: {
      puppy: { startWeeks: 8, intervalWeeks: [2, 4], endWeeks: 16 },
      firstBooster: { afterMonths: 6 },
      adult: { intervalYears: 1 },
    },
    notes: 'Incluye Parainfluenza; revacunación anual por Leptospira.',
    route: ['SC', 'IM'],
  },
  {
    id: 'octuple',
    name: 'Óctuple (CDV + CAV-2 + CPV-2 + PI + Leptospira + Bordetella)',
    shortName: 'Óctuple',
    group: 'core',
    antigens: ['CDV', 'CAV-2', 'CPV-2', 'PI', 'Leptospira spp.', 'Bordetella bronchiseptica'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'core+regional+elective',
    schedule: {
      puppy: { startWeeks: 8, intervalWeeks: [2, 4], endWeeks: 16 },
      firstBooster: { afterMonths: 6 },
      adult: { intervalYears: 1 },
    },
    notes: 'Indicada para perros con exposición social frecuente. Revacunación anual.',
    route: ['SC', 'IM'],
  },

  // ── Core regional — riesgo ambiental ────────────────────────────────────
  {
    id: 'leptospira',
    name: 'Leptospira spp.',
    shortName: 'Leptospira',
    group: 'regional_core',
    antigens: ['Leptospira spp.'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'non-core',
    riskFactors: ['contactWithRodents', 'standsWater', 'ruralOrVisitsRural', 'rawDiet'],
    schedule: {
      puppy: { startWeeks: 8, intervalWeeks: [2, 4], notes: 'Segunda dosis 2–4 semanas después de la primera' },
      adult: { intervalYears: 1 },
    },
    notes: 'Recomendada en zonas endémicas, perros rurales o con acceso a agua/barro/roedores. Refuerzo anual obligatorio.',
    route: ['SC', 'IM'],
  },

  // ── Electivas — riesgo social ────────────────────────────────────────────
  {
    id: 'bordetella',
    name: 'Bordetella bronchiseptica + Parainfluenza',
    shortName: 'Bordetella',
    group: 'elective',
    antigens: ['Bordetella bronchiseptica', 'Parainfluenza virus'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'non-core',
    riskFactors: ['daycare', 'groomer', 'dogParkAttendance'],
    schedule: {
      puppy: { notes: 'Mucosal/oral: una dosis según producto; parenteral: revisar prospecto del fabricante' },
      adult: { intervalYears: 1 },
    },
    notes: 'Indicada para perros en guarderías, peluquerías, pensiones o exposiciones. La vía de administración (intranasal, oral, parenteral) condiciona el esquema.',
    route: ['IN', 'PO', 'SC'],
  },
  {
    id: 'gardia',
    name: 'Giardia',
    shortName: 'Giardia',
    group: 'elective',
    antigens: ['Giardia duodenalis'],
    senasaRequired: false,
    countries: ['AR', 'UY'],
    wsavaClassification: 'non-core',
    riskFactors: ['standsWater', 'dogParkAttendance', 'cohabitsWithDogs'],
    schedule: {
      adult: { notes: 'Consultar con veterinario según disponibilidad local' },
    },
    notes: 'Disponibilidad limitada. Consultar disponibilidad local con el veterinario.',
    route: ['SC'],
  },
];

/**
 * Retorna el catálogo filtrado por país (o el completo si no se especifica).
 */
function getCatalog(country) {
  if (!country) return catalog;
  return catalog.filter((v) => !v.countries || v.countries.includes(String(country).toUpperCase()));
}

/**
 * Retorna una vacuna por su id.
 */
function getVaccineById(id) {
  return catalog.find((v) => v.id === id) || null;
}

module.exports = { catalog, getCatalog, getVaccineById };
