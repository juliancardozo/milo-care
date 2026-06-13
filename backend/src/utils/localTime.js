'use strict';

/**
 * Helpers de hora local por zona horaria IANA.
 *
 * El check-in diario necesita razonar en la zona del usuario, no en UTC: un
 * check-in a las 23:00 ART debe contar como "hoy", no como el día siguiente UTC.
 * Por eso la unicidad diaria y la rotación de preguntas usan una fecha local
 * `YYYY-MM-DD` derivada acá con `Intl.DateTimeFormat`.
 */

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

function safeTimeZone(timezone) {
  return timezone && String(timezone).trim() ? String(timezone).trim() : DEFAULT_TZ;
}

/**
 * Fecha local en formato `YYYY-MM-DD` para una zona horaria dada.
 * @param {string} timezone - IANA timezone (ej. 'America/Montevideo')
 * @param {Date} [date] - instante a convertir (default: ahora)
 * @returns {string} 'YYYY-MM-DD'
 */
function localDateString(timezone, date = new Date()) {
  try {
    // en-CA produce el formato ISO YYYY-MM-DD de forma estable.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimeZone(timezone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}

/**
 * Hora local (0–23) para una zona horaria dada.
 * @param {string} timezone
 * @param {Date} [date]
 * @returns {number} 0–23
 */
function localHour(timezone, date = new Date()) {
  try {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: safeTimeZone(timezone),
      hour: '2-digit',
      hour12: false,
    }).format(date);
    // en-GB puede devolver "24" a medianoche en algunos motores; normalizar.
    const h = parseInt(hourStr, 10) % 24;
    return Number.isNaN(h) ? new Date(date).getUTCHours() : h;
  } catch {
    return new Date(date).getUTCHours();
  }
}

/**
 * Día de la semana local (0=domingo … 6=sábado) — usado por la rotación de
 * preguntas para garantizar cobertura semanal determinística.
 */
function localDayOfWeek(timezone, date = new Date()) {
  const [y, m, d] = localDateString(timezone, date).split('-').map(Number);
  // Date.UTC con la fecha local da un día de semana estable e independiente de TZ.
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Suma (o resta) días a una fecha local `YYYY-MM-DD`, devolviendo otra string
 * `YYYY-MM-DD`. Aritmética de calendario pura, sin zona horaria.
 */
function addDaysToLocalDate(localDate, deltaDays) {
  const [y, m, d] = String(localDate).split('-').map(Number);
  const ms = Date.UTC(y, (m || 1) - 1, d || 1) + deltaDays * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

module.exports = { localDateString, localHour, localDayOfWeek, addDaysToLocalDate, DEFAULT_TZ };
