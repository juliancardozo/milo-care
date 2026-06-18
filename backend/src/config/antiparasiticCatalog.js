'use strict';

/**
 * Catálogo de antiparasitarios EXTERNOS (pulgas y garrapatas).
 *
 * La periodicidad depende del PRODUCTO, no de la etapa de vida, así que se modela
 * por producto. `intervalDays` es la cadencia de re-aplicación recomendada.
 *
 * Fuentes: prospectos de fabricante / uso clínico habitual en AR-UY.
 * Advisory: siempre sujeto a criterio veterinario y al prospecto del producto.
 */

const EXTERNAL_PRODUCTS = [
  {
    id: 'isoxazoline_monthly',
    label: 'Comprimido mensual (isoxazolina)',
    intervalDays: 30,
    // match por nombre comercial o genérico
    keywords: ['nexgard', 'simparica', 'credelio', 'isoxazolina mensual'],
  },
  {
    id: 'isoxazoline_extended',
    label: 'Comprimido prolongado (isoxazolina 12 semanas)',
    intervalDays: 84, // ~12 semanas
    keywords: ['bravecto'],
  },
  {
    id: 'spot_on',
    label: 'Pipeta / spot-on',
    intervalDays: 30,
    keywords: ['pipeta', 'spot-on', 'spot on', 'frontline', 'advantix', 'advantage', 'fipronil'],
  },
  {
    id: 'collar',
    label: 'Collar',
    intervalDays: 210, // ~7 meses (rango 6–8)
    keywords: ['collar', 'seresto', 'scalibor'],
  },
  {
    id: 'spray',
    label: 'Spray',
    intervalDays: 30,
    keywords: ['spray', 'aerosol'],
  },
];

const DEFAULT_EXTERNAL_INTERVAL_DAYS = 30;

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita acentos
}

/**
 * Resuelve el intervalo de re-aplicación a partir del nombre del producto externo.
 * Devuelve { id, label, intervalDays } o un fallback genérico mensual.
 */
function resolveExternalProduct(productName) {
  const n = normalize(productName);
  for (const product of EXTERNAL_PRODUCTS) {
    if (product.keywords.some((kw) => n.includes(normalize(kw)))) {
      return { id: product.id, label: product.label, intervalDays: product.intervalDays };
    }
  }
  return { id: 'external_generic', label: 'Antiparasitario externo', intervalDays: DEFAULT_EXTERNAL_INTERVAL_DAYS };
}

module.exports = {
  EXTERNAL_PRODUCTS,
  DEFAULT_EXTERNAL_INTERVAL_DAYS,
  resolveExternalProduct,
};
