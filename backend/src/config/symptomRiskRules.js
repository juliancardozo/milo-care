'use strict';

/**
 * Reglas de alerta de síntomas por fenotipo/raza y factores de estilo de vida.
 * Basado en literatura WSAVA, ESCCAP y reportes de predisposición racial.
 *
 * Cada regla define:
 *  - id: identificador único
 *  - label: nombre legible
 *  - matchBreeds: lista parcial de razas (lowercase, substring match)
 *  - matchLifestyle: flags de lifestyle que activan la regla
 *  - prioritySymptoms: síntomas a los que se sube la prioridad
 *  - alertType: 'respiratory' | 'orthopedic' | 'neurological' | 'cardiac' | 'dermatological' | 'parasitological' | 'gastrointestinal'
 *  - alertMessage: texto de alerta para mostrar en UI
 *  - recommendedAppointment: catalogId sugerido
 */

const rules = [
  {
    id: 'brachycephalic',
    label: 'Razas braquicéfalas',
    matchBreeds: ['bulldog', 'pug', 'boston', 'shih tzu', 'lhasa', 'boxer', 'pekinese', 'pekingese', 'chow', 'french bulldog', 'english bulldog'],
    matchLifestyle: [],
    prioritySymptoms: ['ronquido', 'ronquidos', 'jadeo', 'intolerancia al ejercicio', 'disnea', 'cianosis', 'dermatitis', 'ojo', 'ojos'],
    alertType: 'respiratory',
    alertMessage: 'En razas braquicéfalas los signos respiratorios y térmicos deben evaluarse con mayor urgencia. Considerar consulta preventiva.',
    recommendedAppointment: 'control_sano_adulto',
  },
  {
    id: 'giant_breed_puppy',
    label: 'Cachorros de razas gigantes (crecimiento rápido)',
    matchBreeds: ['gran danes', 'great dane', 'dogo', 'san bernardo', 'saint bernard', 'rottweiler', 'labrador', 'golden retriever', 'mastín', 'mastiff'],
    matchLifestyle: [],
    prioritySymptoms: ['cojera', 'cojeo', 'dolor óseo', 'dolor en pata', 'fiebre', 'inflamación'],
    alertType: 'orthopedic',
    alertMessage: 'Cachorros de razas gigantes tienen predisposición a enfermedad ortopédica del desarrollo. Signos como cojera o dolor deben evaluarse sin demora.',
    recommendedAppointment: 'control_sano_adulto',
    ageCondition: 'puppy',
  },
  {
    id: 'wobbler_predisposed',
    label: 'Doberman / Gran Danés (riesgo Wobbler)',
    matchBreeds: ['doberman', 'gran danes', 'great dane'],
    matchLifestyle: [],
    prioritySymptoms: ['ataxia', 'arrastre', 'tropiezo', 'dolor cervical', 'cuello', 'debilidad posterior', 'caída'],
    alertType: 'neurological',
    alertMessage: 'Esta raza tiene predisposición a Síndrome de Wobbler. Los signos neurológicos progresivos (ataxia, arrastre, dolor cervical) requieren evaluación urgente.',
    recommendedAppointment: 'urgencia',
  },
  {
    id: 'mitral_valve_disease',
    label: 'Razas con predisposición a enfermedad valvular mitral',
    matchBreeds: ['cavalier', 'king charles', 'chihuahua', 'poodle', 'caniche', 'dachshund', 'salchicha', 'bichon', 'yorkshire', 'maltés', 'maltese'],
    matchLifestyle: [],
    prioritySymptoms: ['tos', 'fatiga', 'intolerancia al ejercicio', 'síncope', 'desmayo', 'soplo'],
    alertType: 'cardiac',
    alertMessage: 'Esta raza tiene alta predisposición a enfermedad valvular mitral. Los signos cardíacos deben evaluarse incluso en perros jóvenes.',
    recommendedAppointment: 'control_sano_adulto',
  },
  {
    id: 'stafford_demodicosis',
    label: 'Razas con predisposición a demodicosis juvenil',
    matchBreeds: ['staffordshire', 'stafford', 'american pit', 'pitbull', 'american bully', 'shar pei'],
    matchLifestyle: [],
    prioritySymptoms: ['alopecia', 'pérdida de pelo', 'eritema', 'prurito', 'lesiones cutáneas', 'piel'],
    alertType: 'dermatological',
    alertMessage: 'Esta raza tiene predisposición a demodicosis juvenil. Las lesiones cutáneas recurrentes deben evaluarse dermatológicamente.',
    recommendedAppointment: 'control_sano_adulto',
    ageCondition: 'young',
  },
  {
    id: 'high_exposure_parasites',
    label: 'Alta exposición parasitaria (exterior / caza / carne cruda)',
    matchBreeds: [],
    matchLifestyle: ['ruralOrVisitsRural', 'rawDiet', 'contactWithRodents'],
    prioritySymptoms: ['diarrea', 'vómitos', 'pérdida de peso', 'prurito perianal', 'parásitos en heces', 'lombrices'],
    alertType: 'parasitological',
    alertMessage: 'El perfil de riesgo de exposición ambiental eleva la prioridad de signos gastrointestinales. Considerar coprológico o antiparasitarios más frecuentes.',
    recommendedAppointment: 'control_sano_adulto',
  },
  {
    id: 'social_respiratory',
    label: 'Alta socialización (guardería / peluquería / exposición)',
    matchBreeds: [],
    matchLifestyle: ['daycare', 'groomer', 'dogParkAttendance'],
    prioritySymptoms: ['tos', 'estornudos', 'secreción nasal', 'fiebre', 'apatía', 'descarga ocular'],
    alertType: 'respiratory',
    alertMessage: 'La alta socialización eleva el riesgo de enfermedades respiratorias (Bordetella, Parainfluenza). Evaluar los signos respiratorios con mayor atención.',
    recommendedAppointment: 'control_signos',
  },
];

/**
 * Evalúa qué reglas aplican a un perro dado su raza y estilo de vida.
 * @param {string} breed
 * @param {object} lifestyle - flags de lifestyle (livesIndoors, daycare, etc.)
 * @param {number|null} ageMonths
 * @returns {Array} reglas activas
 */
function getActiveRules(breed = '', lifestyle = {}, ageMonths = null) {
  const breedLower = String(breed).toLowerCase();
  const isPuppy = ageMonths !== null && ageMonths < 12;
  const isYoung = ageMonths !== null && ageMonths < 24;

  return rules.filter((rule) => {
    // Age condition
    if (rule.ageCondition === 'puppy' && !isPuppy) return false;
    if (rule.ageCondition === 'young' && !isYoung) return false;

    // Breed match (partial, case-insensitive)
    const breedMatch = rule.matchBreeds.length === 0 ||
      rule.matchBreeds.some((b) => breedLower.includes(b.toLowerCase()));

    // Lifestyle match (any flag active)
    const lifestyleMatch = rule.matchLifestyle.length === 0 ||
      rule.matchLifestyle.some((flag) => lifestyle[flag]);

    return breedMatch || lifestyleMatch;
  });
}

/**
 * Evalúa si un síntoma descrito activa alguna alerta de alta prioridad.
 * @param {string} symptomText
 * @param {Array} activeRules
 * @returns {Array} alertas activas
 */
function getSymptomAlerts(symptomText, activeRules = []) {
  const lower = symptomText.toLowerCase();
  const triggered = [];

  for (const rule of activeRules) {
    const match = rule.prioritySymptoms.some((s) => lower.includes(s.toLowerCase()));
    if (match) triggered.push(rule);
  }

  return triggered;
}

module.exports = { rules, getActiveRules, getSymptomAlerts };
