'use strict';

/**
 * petActivity — "mascota activa", la North Star B2B2C y unidad de facturación.
 *
 * Definición (master prompt §4.2): una mascota es ACTIVA en un mes calendario si
 * en ese mes tuvo ≥1 evento de salud registrado (vacuna, desparasitación,
 * medicación, cita, síntoma, consulta) o ≥1 acción cumplida (atestación del vet).
 *
 * `isPetActive(pet, month)` es PURA y testeable: no toca DB ni el reloj global.
 * Un perro cuenta como activo si alguna de sus marcas temporales de actividad cae
 * en el mes. Consideramos tanto la fecha del evento (algo pasó) como `createdAt`
 * (algo se registró en la app ese mes) → ambas son señal de engagement del tutor.
 *
 * El mes se interpreta en UTC para que el corte mensual sea determinístico y no
 * dependa del huso del servidor.
 */

// month: 'YYYY-MM' | Date → [startUTC, endUTC) en milisegundos.
function monthRange(month) {
  let year;
  let monthIndex;
  if (month instanceof Date) {
    year = month.getUTCFullYear();
    monthIndex = month.getUTCMonth();
  } else {
    const [y, m] = String(month).split('-').map(Number);
    year = y;
    monthIndex = m - 1;
  }
  return { start: Date.UTC(year, monthIndex, 1), end: Date.UTC(year, monthIndex + 1, 1) };
}

function inRange(date, start, end) {
  if (!date) return false;
  const t = new Date(date).getTime();
  return Number.isFinite(t) && t >= start && t < end;
}

// Todas las marcas temporales que cuentan como actividad de salud del perro.
function activityDates(pet) {
  const dates = [];
  const push = (...ds) => ds.forEach((d) => d && dates.push(d));

  (pet.vaccinations || []).forEach((v) => push(v.dateAdministered, v.vetValidatedAt, v.createdAt));
  (pet.dewormingHistory || []).forEach((d) => push(d.dateAdministered, d.vetValidatedAt, d.createdAt));
  (pet.medications || []).forEach((m) => push(m.startDate, m.createdAt));
  (pet.appointments || []).forEach((a) => push(a.appointmentDate, a.createdAt));
  (pet.symptoms || []).forEach((s) => push(s.dateObserved, s.createdAt));
  (pet.consultations || []).forEach((c) => push(c.dateOfConsult, c.createdAt));

  return dates;
}

/**
 * ¿La mascota fue activa en `month`?
 * @param {object} pet   Subdocumento de perro (con sus eventos embebidos).
 * @param {string|Date} month  'YYYY-MM' o una fecha dentro del mes.
 * @returns {boolean}
 */
function isPetActive(pet, month) {
  if (!pet) return false;
  const { start, end } = monthRange(month);
  return activityDates(pet).some((d) => inRange(d, start, end));
}

module.exports = { isPetActive, activityDates, monthRange };
