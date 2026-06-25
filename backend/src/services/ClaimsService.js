'use strict';

/**
 * ClaimsService — Claims Assistant v0. Arma un BORRADOR de reclamo enlazando los
 * eventos del historial del perro y generando un resumen ORDENADO para presentar
 * a la aseguradora. Es informativo: no diagnostica, no decide cobertura, no
 * prescribe. La decisión es de la aseguradora.
 *
 * Función pura: recibe el perro (subdoc) y opciones; no toca DB.
 */

const DISCLAIMER =
  'Borrador generado a partir de los registros cargados por el tutor. Es un resumen ' +
  'organizativo para presentar a la aseguradora; no constituye diagnóstico veterinario ni ' +
  'determina la cobertura. La validación clínica corresponde al veterinario y la decisión ' +
  'de cobertura a la aseguradora.';

function fmt(d) {
  if (!d) return 's/f';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? 's/f' : date.toISOString().slice(0, 10);
}

// Eventos candidatos del historial, normalizados a { kind, itemId, label, date }.
function collectCandidateEvents(dog) {
  const events = [];
  const add = (kind, itemId, label, date) => events.push({ kind, itemId, label, date: date || null });

  (dog.symptoms || []).forEach((s) => add('symptom', s._id, s.symptomType || s.quickType || s.description || 'síntoma', s.dateObserved));
  (dog.appointments || []).forEach((a) => { if (!a.isCancelled) add('appointment', a._id, a.title || a.appointmentType || 'consulta', a.appointmentDate); });
  (dog.consultations || []).forEach((c) => add('consultation', c._id, c.reason || 'consulta veterinaria', c.dateOfConsult));
  (dog.medications || []).forEach((m) => add('medication', m._id, m.medicationName, m.startDate));

  return events;
}

/**
 * Construye el borrador de reclamo.
 * @param {object} dog  Subdocumento del perro.
 * @param {object} opts { type:'accident'|'illness', eventIds?:string[], description?:string, now?:Date }
 * @returns {{ type, linkedEvents, generatedSummary, status:'draft' }}
 */
function buildDraft(dog, { type, eventIds = null, description = '', now = new Date() } = {}) {
  const candidates = collectCandidateEvents(dog);

  // Si el tutor eligió eventos, usamos esos; si no, enlazamos los de los últimos 90 días.
  let linkedEvents;
  if (Array.isArray(eventIds) && eventIds.length) {
    const want = new Set(eventIds.map(String));
    linkedEvents = candidates.filter((e) => want.has(String(e.itemId)));
  } else {
    const cutoff = now.getTime() - 90 * 86400000;
    linkedEvents = candidates.filter((e) => e.date && new Date(e.date).getTime() >= cutoff);
  }

  linkedEvents.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const typeLabel = type === 'accident' ? 'accidente' : 'enfermedad';
  const lines = [
    `Borrador de reclamo por ${typeLabel} — ${dog.name || 'mascota'}.`,
    description ? `Descripción del tutor: ${description}` : null,
    linkedEvents.length ? 'Cronología de eventos registrados:' : 'No hay eventos recientes enlazados.',
    ...linkedEvents.map((e) => `• ${fmt(e.date)} — ${e.kind}: ${e.label}`),
  ].filter(Boolean);

  return {
    type,
    linkedEvents,
    generatedSummary: lines.join('\n'),
    disclaimer: DISCLAIMER,
    status: 'draft',
  };
}

module.exports = { buildDraft, collectCandidateEvents, DISCLAIMER };
