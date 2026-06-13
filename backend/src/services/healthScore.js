'use strict';

// Health Score explicable (0–100) del perro, calculado con datos que YA existen.
// Cada factor devuelve sus puntos y un hint accionable: el objetivo es la retención
// ("cargá las vacunas para +18"), no un número opaco. Función pura y testeable:
// recibe `now` y `streak` explícitamente (sin acceder a colecciones ni al reloj global).

const FACTOR_LABELS = {
  vaccines: 'Vacunas al día',
  deworming: 'Desparasitación',
  checkin: 'Ritual de check-in',
  wellbeing: 'Bienestar reciente',
  profile: 'Perfil completo',
  vetFollowup: 'Seguimiento veterinario',
};

function isPast(date, now) {
  return Boolean(date) && new Date(date).getTime() < now.getTime();
}

function daysSince(date, now) {
  return (now.getTime() - new Date(date).getTime()) / 86400000;
}

// Vacunas (30): al día si el último refuerzo programado no está vencido.
function vaccinesFactor(dog, now) {
  const max = 30;
  const vacs = dog.vaccinations || [];
  if (vacs.length === 0) {
    return { points: 0, max, status: 'bad', hint: 'Cargá sus vacunas para sumar +30' };
  }
  const dueDates = vacs.map((v) => v.nextDueDate).filter(Boolean).map((d) => new Date(d));
  if (dueDates.length > 0) {
    const latest = new Date(Math.max(...dueDates.map((d) => d.getTime())));
    if (isPast(latest, now)) {
      return { points: 12, max, status: 'warn', hint: 'Tiene un refuerzo vencido' };
    }
  }
  return { points: 30, max, status: 'good', hint: 'Vacunas al día' };
}

// Desparasitación (15): al día si el próximo turno no está vencido.
function dewormingFactor(dog, now) {
  const max = 15;
  const items = dog.dewormingHistory || [];
  if (items.length === 0) {
    return { points: 0, max, status: 'bad', hint: 'Registrá su desparasitación para +15' };
  }
  const dueDates = items.map((d) => d.nextDueDate).filter(Boolean).map((d) => new Date(d));
  if (dueDates.length > 0) {
    const latest = new Date(Math.max(...dueDates.map((d) => d.getTime())));
    if (isPast(latest, now)) {
      return { points: 6, max, status: 'warn', hint: 'La desparasitación está vencida' };
    }
  }
  return { points: 15, max, status: 'good', hint: 'Desparasitación al día' };
}

// Ritual de check-in (20): por racha de días consecutivos.
function checkinFactor(streak) {
  const max = 20;
  if (streak >= 7) return { points: 20, max, status: 'good', hint: `¡${streak} días de racha!` };
  if (streak >= 3) return { points: 14, max, status: 'good', hint: 'Buena racha, seguí así' };
  if (streak >= 1) return { points: 8, max, status: 'warn', hint: 'Hacé el check-in unos días seguidos' };
  return { points: 0, max, status: 'bad', hint: 'Empezá su check-in diario para +20' };
}

// Bienestar reciente (15): penaliza síntomas no resueltos de los últimos 14 días.
function wellbeingFactor(dog, now) {
  const max = 15;
  const recent = (dog.symptoms || []).filter(
    (s) => s.dateObserved && daysSince(s.dateObserved, now) <= 14 && !s.resolved
  );
  if (recent.some((s) => s.severity === 'severe')) {
    return { points: 3, max, status: 'bad', hint: 'Tiene un síntoma severo sin resolver' };
  }
  if (recent.some((s) => s.severity === 'moderate')) {
    return { points: 8, max, status: 'warn', hint: 'Seguí de cerca un síntoma moderado' };
  }
  if (recent.length > 0) {
    return { points: 12, max, status: 'warn', hint: 'Hay un síntoma leve reciente' };
  }
  return { points: 15, max, status: 'good', hint: 'Sin síntomas recientes' };
}

// Perfil completo (10): foto, peso y sexo cargados.
function profileFactor(dog) {
  const max = 10;
  let points = 0;
  const missing = [];
  if (dog.photoUrl) points += 4; else missing.push('foto');
  if (dog.weightKg != null) points += 3; else missing.push('peso');
  if (dog.sex && dog.sex !== 'unknown') points += 3; else missing.push('sexo');
  if (points === max) return { points, max, status: 'good', hint: 'Perfil completo' };
  return { points, max, status: points >= 4 ? 'warn' : 'bad', hint: `Completá: ${missing.join(', ')}` };
}

// Seguimiento veterinario (10): turno futuro o consulta en el último año.
function vetFollowupFactor(dog, now) {
  const max = 10;
  const appts = dog.appointments || [];
  const consults = dog.consultations || [];
  const hasFuture = appts.some((a) => !a.isCancelled && a.appointmentDate && !isPast(a.appointmentDate, now));
  const recentConsult = consults.some((c) => c.dateOfConsult && daysSince(c.dateOfConsult, now) <= 365);
  if (hasFuture || recentConsult) {
    return { points: 10, max, status: 'good', hint: 'Con seguimiento al día' };
  }
  const hasAny = appts.length > 0 || consults.length > 0;
  if (hasAny) {
    return { points: 5, max, status: 'warn', hint: 'Agendá su próximo control' };
  }
  return { points: 0, max, status: 'bad', hint: 'Agendá una visita al veterinario' };
}

function gradeFor(score) {
  if (score >= 85) return { key: 'excellent', label: 'Excelente', color: '#16a34a' };
  if (score >= 70) return { key: 'good', label: 'Muy bien', color: '#22c55e' };
  if (score >= 50) return { key: 'fair', label: 'A mejorar', color: '#f59e0b' };
  return { key: 'attention', label: 'Necesita atención', color: '#ef4444' };
}

/**
 * @param {object} dog  Subdocumento de perro (con vaccinations, dewormingHistory, symptoms, etc.)
 * @param {object} opts { now?: Date, streak?: number }
 * @returns {{ score, grade, factors }}
 */
function computeHealthScore(dog, { now = new Date(), streak = 0 } = {}) {
  const raw = {
    vaccines: vaccinesFactor(dog, now),
    deworming: dewormingFactor(dog, now),
    checkin: checkinFactor(streak),
    wellbeing: wellbeingFactor(dog, now),
    profile: profileFactor(dog),
    vetFollowup: vetFollowupFactor(dog, now),
  };

  const factors = Object.entries(raw).map(([key, f]) => ({ key, label: FACTOR_LABELS[key], ...f }));
  const score = Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.points, 0)));

  return { score, grade: gradeFor(score), factors };
}

module.exports = { computeHealthScore, gradeFor };
