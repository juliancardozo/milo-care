'use strict';

/**
 * Reglas vacunales y regulatorias por país.
 *
 * Matiz regulatorio importante (reflejado en `rabies`):
 *  - AR (SENASA): la antirrábica es OBLIGATORIA por Ley N° 22.953, desde los 3 meses
 *    y con revacunación anual de por vida. La operativa (campañas, frecuencia exacta)
 *    la fija cada provincia/municipio.
 *  - UY (MGAP): Uruguay está libre de rabia urbana canina; no hay campaña doméstica
 *    anual obligatoria. La exigencia antirrábica aparece para movimiento internacional
 *    (Certificado Veterinario Internacional): mínimo 3 meses, al menos 30 días antes
 *    del viaje y vigencia máxima de 1 año. La obligación legal doméstica central es la
 *    identificación con microchip y registro en INBA (tenencia responsable).
 */

module.exports = {
  AR: {
    rabiesRequiredFromMonths: 3,
    coreVaccines: ['triple'],
    conditionalVaccines: ['leptospira', 'bordetella'],
    rabies: {
      // Obligatoria a nivel nacional, revacunación anual.
      mandatory: true,
      reason: 'legal',
      intervalMonths: 12,
      law: 'Ley N° 22.953',
      authority: 'SENASA',
      note: 'Antirrábica obligatoria desde los 3 meses y revacunación anual (Ley N° 22.953). La operativa la define cada provincia/municipio.',
    },
    legalMilestones: [],
  },
  UY: {
    rabiesRequiredFromMonths: 3,
    coreVaccines: ['triple'],
    conditionalVaccines: ['leptospira', 'bordetella'],
    rabies: {
      // No obligatoria a nivel doméstico; requerida para movilidad internacional.
      mandatory: false,
      reason: 'mobility',
      intervalMonths: 12,
      authority: 'MGAP',
      note: 'Uruguay está libre de rabia urbana canina. La antirrábica se exige para viajes (CVI): mínimo 3 meses, al menos 30 días antes del viaje y vigencia máxima de 1 año. Recomendada según criterio veterinario.',
    },
    legalMilestones: [
      {
        id: 'microchip_inba',
        title: 'Identificación con microchip y registro en INBA',
        authority: 'INBA / MGAP',
        reason: 'legal',
        note: 'Tenencia responsable: la ley uruguaya exige identificar al perro con microchip y registrarlo en INBA.',
      },
    ],
  },
};
