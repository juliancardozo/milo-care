'use strict';

/**
 * CoverageService — helper "¿lo cubre mi póliza?". INFORMATIVO y NO vinculante:
 * orienta al tutor según la `coverage` cargada, siempre con disclaimer y siempre
 * derivando la decisión final a la aseguradora. Nunca afirma cobertura como un hecho.
 *
 * Función pura y testeable.
 */

const DISCLAIMER =
  'Esta es una orientación informativa basada en los datos de tu póliza cargados en la app. ' +
  'NO es una confirmación de cobertura ni una decisión vinculante. La cobertura final la define ' +
  'tu aseguradora. Ante una urgencia, consultá siempre a tu veterinario.';

// Sinónimos por tipo de evento → para matchear contra los ítems de la póliza.
const EVENT_ALIASES = {
  accidente: ['accidente', 'accident', 'lesion', 'lesión', 'fractura', 'trauma'],
  enfermedad: ['enfermedad', 'illness', 'enfermedades'],
  cirugia: ['cirugia', 'cirugía', 'surgery', 'quirurgico', 'quirúrgico'],
  consulta: ['consulta', 'consultation', 'visita', 'control'],
  vacuna: ['vacuna', 'vaccination', 'vacunacion', 'vacunación', 'inmunizacion'],
  internacion: ['internacion', 'internación', 'hospitalizacion', 'hospitalización'],
  estudios: ['estudios', 'analisis', 'análisis', 'laboratorio', 'diagnostico', 'diagnóstico'],
};

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// ¿El ítem de cobertura matchea el tipo de evento consultado? Match directo o vía
// un grupo de sinónimos que contenga tanto al ítem como al evento (ej. "fractura"
// y "accidente" caen en el mismo grupo).
function itemMatchesEvent(coverageItem, eventType) {
  const item = norm(coverageItem);
  const ev = norm(eventType);
  if (!item || !ev) return false;
  if (item === ev || item.includes(ev) || ev.includes(item)) return true;

  for (const aliases of Object.values(EVENT_ALIASES)) {
    const na = aliases.map(norm);
    const itemIn = na.some((a) => item.includes(a) || a.includes(item));
    const evIn = na.some((a) => ev.includes(a) || a.includes(ev));
    if (itemIn && evIn) return true;
  }
  return false;
}

/**
 * @returns {{
 *   likelyCovered: boolean,   // SIEMPRE orientativo (ver disclaimer)
 *   confidence: 'unknown'|'low'|'medium',
 *   item: string|null, limit: number|null, currency: string|null,
 *   carenciaDays: number, inCarencia: boolean,
 *   message: string, disclaimer: string,
 * }}
 */
function checkCoverage(policy, eventType, now = new Date()) {
  const coverage = (policy && policy.coverage) || [];
  const match = coverage.find((c) => itemMatchesEvent(c.item, eventType));

  if (!match) {
    return {
      likelyCovered: false,
      confidence: 'unknown',
      item: null, limit: null, currency: null, carenciaDays: 0, inCarencia: false,
      message: `No encontramos "${eventType}" entre los ítems de tu póliza. Es posible que no esté detallado; consultá con tu aseguradora para confirmarlo.`,
      disclaimer: DISCLAIMER,
    };
  }

  let inCarencia = false;
  if (match.carenciaDays && policy.startDate) {
    const elapsedDays = (now.getTime() - new Date(policy.startDate).getTime()) / 86400000;
    inCarencia = elapsedDays >= 0 && elapsedDays < match.carenciaDays;
  }

  const likelyCovered = Boolean(match.covered) && !inCarencia;
  let message;
  if (!match.covered) {
    message = `Según tu póliza, "${match.item}" figura como NO cubierto. Confirmá los detalles con tu aseguradora.`;
  } else if (inCarencia) {
    message = `"${match.item}" estaría cubierto, pero todavía estás dentro del período de carencia (${match.carenciaDays} días desde el alta). Verificá la fecha con tu aseguradora.`;
  } else {
    message = `"${match.item}" probablemente esté cubierto${match.limit ? ` hasta ${match.limit} ${match.currency || ''}`.trim() : ''}. Confirmá el detalle y el reintegro con tu aseguradora antes de avanzar.`;
  }

  return {
    likelyCovered,
    confidence: 'medium',
    item: match.item,
    limit: match.limit ?? null,
    currency: match.currency || null,
    carenciaDays: match.carenciaDays || 0,
    inCarencia,
    message,
    disclaimer: DISCLAIMER,
  };
}

module.exports = { checkCoverage, DISCLAIMER };
