'use strict';

/**
 * Catálogo de tipos de cita canina basado en:
 *  - WSAVA Guidelines for the Vaccination of Dogs and Cats 2022
 *  - WSAVA Preventive Healthcare Guidelines
 *
 * Cada entrada incluye:
 *  - id, name, group, frecuencia sugerida, disparadores, checklist
 *  - isWsavaRecommended: si aparece en las guías WSAVA como práctica preventiva
 *  - urgency: si es una visita de urgencia
 */

const catalog = [
  // ── Vacunación ───────────────────────────────────────────────────────────────
  {
    id: 'vacunacion_cachorro',
    name: 'Vacunación cachorro',
    group: 'vaccination',
    isWsavaRecommended: true,
    urgency: false,
    frequency: 'Cada 2–4 semanas hasta completar la serie (hasta las 16 semanas)',
    triggers: ['age_puppy', 'vaccination_schedule'],
    checklist: [
      'Peso y temperatura',
      'Estado general (activo, hidratado, afebril)',
      'Reacción a dosis anteriores',
      'Número de lote del producto aplicado',
      'Nombre del aplicador',
      'Próxima fecha de refuerzo',
    ],
    notes: 'Serie inicial de cachorros. Iniciar no antes de las 6 semanas; repetir cada 2–4 semanas hasta las 16 semanas o más.',
    colorClass: 'appt-vaccination',
  },
  {
    id: 'refuerzo_adulto',
    name: 'Refuerzo vacunal adulto',
    group: 'vaccination',
    isWsavaRecommended: true,
    urgency: false,
    frequency: 'Según antígeno, ley local y perfil de riesgo',
    triggers: ['next_due_at', 'new_exposure_risk'],
    checklist: [
      'Antígeno a reforzar',
      'Fecha ideal de aplicación',
      'Ventana de tolerancia del producto',
      'Justificativo si hay postergación',
      'Estado general del paciente',
    ],
    notes: 'La frecuencia depende del antígeno (ej. Rabia: anual; Triple core: cada 3 años WSAVA). Ver normativa local.',
    colorClass: 'appt-vaccination',
  },

  // ── Controles periódicos ─────────────────────────────────────────────────────
  {
    id: 'control_sano_adulto',
    name: 'Control sano adulto',
    group: 'preventive',
    isWsavaRecommended: true,
    urgency: false,
    frequency: 'Al menos anual',
    triggers: ['no_checkup_in_12_months'],
    checklist: [
      'Peso y condición corporal (escala 1–9)',
      'Tipo y calidad de la dieta',
      'Nivel de actividad física',
      'Estado de desparasitación (interno y externo)',
      'Salud dental y cavidad oral',
      'Cambios conductuales o de comportamiento',
      'Vacunación al día',
    ],
    notes: 'WSAVA enfatiza que la consulta preventiva no debe limitarse a vacunar. Es la oportunidad de evaluar bienestar integral.',
    colorClass: 'appt-preventive',
  },
  {
    id: 'control_senior',
    name: 'Control senior / comorbilidades',
    group: 'preventive',
    isWsavaRecommended: true,
    urgency: false,
    frequency: 'Cada 6 meses como mínimo prudente',
    triggers: ['age_senior', 'comorbidity_oa', 'comorbidity_cardiac', 'comorbidity_renal', 'comorbidity_endocrine', 'polypharmacy'],
    checklist: [
      'Peso (comparar con visita anterior)',
      'Ingesta de agua y frecuencia de micción',
      'Apetito y cambios en la dieta',
      'Evaluación de dolor (movilidad, postura)',
      'Adherencia a medicación crónica',
      'Alertas de laboratorio pendientes (perfil renal, hepático)',
      'Calidad de vida percibida por el tutor',
    ],
    notes: 'Pacientes senior, con OA, obesidad, cardiopatía, nefropatía, endocrinopatía o en polifarmacia requieren seguimiento semestral.',
    colorClass: 'appt-preventive',
  },
  {
    id: 'control_medicacion',
    name: 'Control de medicación crónica',
    group: 'follow_up',
    isWsavaRecommended: true,
    urgency: false,
    frequency: '2–4 semanas al iniciar; luego cada 1–3 meses según estabilidad',
    triggers: ['new_medication', 'chronic_nsaid', 'dose_change'],
    checklist: [
      'Respuesta clínica al tratamiento',
      'Eventos adversos o efectos secundarios',
      'Adherencia del tutor al esquema',
      'Fecha de fin o revaluación del tratamiento',
      'Ajuste de dosis si corresponde',
    ],
    notes: 'Especialmente importante en AINEs crónicos, corticoides, inmunosupresores y tratamientos de larga duración.',
    colorClass: 'appt-followup',
  },
  {
    id: 'control_signos',
    name: 'Reevaluación de signos',
    group: 'follow_up',
    isWsavaRecommended: true,
    urgency: false,
    frequency: 'Según evolución clínica (días a semanas)',
    triggers: ['symptom_logged', 'recent_illness'],
    checklist: [
      'Evolución de los signos desde la última consulta',
      'Nuevos síntomas aparecidos',
      'Respuesta al tratamiento indicado',
      'Estado general y apetito',
    ],
    notes: 'Para seguimiento de procesos en curso o síntomas monitoreados.',
    colorClass: 'appt-followup',
  },

  // ── Urgencia ─────────────────────────────────────────────────────────────────
  {
    id: 'urgencia',
    name: 'Urgencia / emergencia',
    group: 'emergency',
    isWsavaRecommended: false,
    urgency: true,
    frequency: 'Inmediato / mismo día',
    triggers: [
      'disnea', 'colapso', 'convulsiones',
      'vomitos_diarrea_letargia', 'torsion_abdominal',
      'sangrado', 'trauma', 'anuria',
    ],
    checklist: [
      '⚠ Disnea o dificultad respiratoria',
      '⚠ Colapso o pérdida de consciencia',
      '⚠ Convulsiones o actividad epiléptica',
      '⚠ Vómitos/diarrea intensos con letargia',
      '⚠ Distensión abdominal súbita (sospecha de torsión)',
      '⚠ Sangrado activo que no cede',
      '⚠ Trauma (accidente, caída, mordedura grave)',
      '⚠ Anuria o retención urinaria',
    ],
    notes: 'Ante cualquiera de estos signos, concurrir inmediatamente a una guardia veterinaria.',
    colorClass: 'appt-emergency',
  },
];

const GROUP_LABELS = {
  vaccination: 'Vacunación',
  preventive: 'Controles preventivos (WSAVA)',
  follow_up: 'Seguimiento / revaluación',
  emergency: 'Urgencia',
};

function getCatalog() {
  return catalog;
}

function getAppointmentById(id) {
  return catalog.find((a) => a.id === id) || null;
}

module.exports = { catalog, getCatalog, getAppointmentById, GROUP_LABELS };
