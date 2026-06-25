'use strict';

const User = require('../models/User');
const { isPetActive, monthRange } = require('./petActivity');
const { computeHealthScore } = require('./healthScore');

/**
 * MetricsService — métricas AGREGADAS de la cohorte de un partner. Por diseño NO
 * devuelve PII ni dato clínico individual: solo conteos y ratios. El partner_admin
 * nunca ve nombres de perros/tutores ni eventos clínicos puntuales.
 */

function prevMonthKey(month) {
  const [y, m] = String(month).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Cuenta eventos del perro cuya fecha cae en el mes (por tipo).
function countEventsInMonth(dog, month, acc) {
  const { start, end } = monthRange(month);
  const inMonth = (d) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return Number.isFinite(t) && t >= start && t < end;
  };
  (dog.vaccinations || []).forEach((v) => { if (inMonth(v.dateAdministered)) acc.vaccinations += 1; });
  (dog.dewormingHistory || []).forEach((x) => { if (inMonth(x.dateAdministered)) acc.deworming += 1; });
  (dog.medications || []).forEach((m) => { if (inMonth(m.startDate)) acc.medications += 1; });
  (dog.appointments || []).forEach((a) => { if (inMonth(a.appointmentDate)) acc.appointments += 1; });
  (dog.symptoms || []).forEach((s) => { if (inMonth(s.dateObserved)) acc.symptoms += 1; });
  (dog.consultations || []).forEach((c) => { if (inMonth(c.dateOfConsult)) acc.consultations += 1; });
}

function dogUpToDate(dog, now) {
  const { factors } = computeHealthScore(dog, { now });
  const byKey = Object.fromEntries(factors.map((f) => [f.key, f]));
  return byKey.vaccines?.status === 'good' && byKey.deworming?.status === 'good';
}

/**
 * @returns métricas agregadas del partner para el mes (sin PII).
 */
async function computeMetrics(partner, month, { now = new Date() } = {}) {
  const users = await User.find({ 'dogs.partnerId': partner._id }).select('dogs').lean();
  const prevMonth = prevMonthKey(month);

  let totalPets = 0;
  let activePets = 0;
  let activePrevMonth = 0;
  let upToDate = 0;
  const eventsByType = { vaccinations: 0, deworming: 0, medications: 0, appointments: 0, symptoms: 0, consultations: 0 };

  for (const user of users) {
    for (const dog of user.dogs || []) {
      if (String(dog.partnerId) !== String(partner._id)) continue;
      totalPets += 1;
      if (isPetActive(dog, month)) activePets += 1;
      if (isPetActive(dog, prevMonth)) activePrevMonth += 1;
      if (dogUpToDate(dog, now)) upToDate += 1;
      countEventsInMonth(dog, month, eventsByType);
    }
  }

  const ratio = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 1000 : 0);

  return {
    partnerId: String(partner._id),
    month,
    totalPets,
    activePets,
    // Adherencia: % de la cohorte con vacunas y desparasitación al día.
    adherenceRate: ratio(upToDate, totalPets),
    // Retención: activos este mes sobre activos del mes anterior.
    retentionRate: ratio(activePets, activePrevMonth),
    eventsByType,
  };
}

module.exports = { computeMetrics, prevMonthKey };
