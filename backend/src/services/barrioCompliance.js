'use strict';

const User = require('../models/User');

/**
 * barrioCompliance — panel de CUMPLIMIENTO VACUNAL por unidad para un partner de
 * tipo `barrio` (administración de barrio privado / country / consorcio).
 *
 * Principio de minimización de datos (Ley 25.326 AR / Ley 18.331 UY): la
 * administración del barrio ve SOLO el estado de cumplimiento antirrábica por
 * unidad (semáforo) + fecha de vencimiento — que es lo que exige el reglamento
 * interno. NUNCA se expone nombre del tutor, nombre del perro, ni historial
 * clínico. El dato que sale de acá es un agregado por unidad, no un registro
 * clínico individual.
 *
 * La antirrábica es el eje: en AR es obligatoria y de revacunación anual
 * (Ley N° 22.953, SENASA) — ver src/config/vaccinationRules.js.
 */

const RABIES_RE = /rabi|antirr[aá]b/i; // "Rabia", "Antirrábica", "Rabies", etc.
const RABIES_INTERVAL_MONTHS = 12; // revacunación anual
const SOON_WINDOW_DAYS = 30; // "por vencer" = vence dentro de 30 días

// Estados del semáforo, del más accionable al menos. El orden importa: define el
// "peor estado" de una unidad con varias mascotas.
const STATUS = {
  vencido: { rank: 0, color: 'red', label: 'Vencido' },
  sin_registro: { rank: 1, color: 'grey', label: 'Sin registro' },
  por_vencer: { rank: 2, color: 'amber', label: 'Por vencer' },
  al_dia: { rank: 3, color: 'green', label: 'Al día' },
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Estado de cumplimiento antirrábica de un perro.
 * @returns {{ status: string, nextDueDate: Date|null }}
 */
function dogRabiesStatus(dog, now) {
  const rabies = (dog.vaccinations || [])
    .filter((v) => RABIES_RE.test(v.vaccineName || ''))
    .sort((a, b) => new Date(b.dateAdministered) - new Date(a.dateAdministered));

  if (rabies.length === 0) return { status: 'sin_registro', nextDueDate: null };

  const last = rabies[0];
  // Preferimos el vencimiento explícito; si falta, lo derivamos (aplicada + 12 meses).
  const nextDueDate = last.nextDueDate
    ? new Date(last.nextDueDate)
    : last.dateAdministered
      ? addMonths(last.dateAdministered, RABIES_INTERVAL_MONTHS)
      : null;

  if (!nextDueDate) return { status: 'sin_registro', nextDueDate: null };

  const soon = new Date(now.getTime() + SOON_WINDOW_DAYS * 86400000);
  let status;
  if (nextDueDate < now) status = 'vencido';
  else if (nextDueDate <= soon) status = 'por_vencer';
  else status = 'al_dia';

  return { status, nextDueDate };
}

function worseOf(a, b) {
  return STATUS[a].rank <= STATUS[b].rank ? a : b;
}

/**
 * Reporte de cumplimiento del barrio, agregado por unidad. Sin PII ni clínica.
 *
 * @param {import('mongoose').Document} partner  partner de tipo `barrio`
 * @param {{ now?: Date }} opts
 * @returns objeto con totales, distribución del semáforo y filas por unidad.
 */
async function computeCompliance(partner, { now = new Date() } = {}) {
  const users = await User.find({ 'dogs.partnerId': partner._id })
    .select('dogs.partnerId dogs.partnerUnit dogs.vaccinations')
    .lean();

  // Acumulador por unidad.
  const units = new Map(); // unit -> { pets, byStatus, worst, nextDueDate }
  const totals = { pets: 0, al_dia: 0, por_vencer: 0, vencido: 0, sin_registro: 0 };

  for (const user of users) {
    for (const dog of user.dogs || []) {
      if (String(dog.partnerId) !== String(partner._id)) continue;

      const { status, nextDueDate } = dogRabiesStatus(dog, now);
      const unit = (dog.partnerUnit && dog.partnerUnit.trim()) || 'Sin unidad';

      totals.pets += 1;
      totals[status] += 1;

      if (!units.has(unit)) {
        units.set(unit, {
          unit, pets: 0,
          byStatus: { al_dia: 0, por_vencer: 0, vencido: 0, sin_registro: 0 },
          worst: 'al_dia', nextDueDate: null,
        });
      }
      const u = units.get(unit);
      u.pets += 1;
      u.byStatus[status] += 1;
      u.worst = worseOf(u.worst, status);
      // Vencimiento más próximo de la unidad (para priorizar avisos).
      if (nextDueDate && (!u.nextDueDate || nextDueDate < u.nextDueDate)) {
        u.nextDueDate = nextDueDate;
      }
    }
  }

  // Ordenamos: primero lo accionable (peor estado), luego por vencimiento próximo.
  const rows = [...units.values()].sort((a, b) => {
    if (STATUS[a.worst].rank !== STATUS[b.worst].rank) return STATUS[a.worst].rank - STATUS[b.worst].rank;
    const at = a.nextDueDate ? a.nextDueDate.getTime() : Infinity;
    const bt = b.nextDueDate ? b.nextDueDate.getTime() : Infinity;
    return at - bt;
  });

  const compliant = totals.al_dia + totals.por_vencer; // "vigente hoy"
  const complianceRate = totals.pets > 0 ? Math.round((compliant / totals.pets) * 1000) / 1000 : 0;

  return {
    partnerId: String(partner._id),
    partner: { name: partner.name, slug: partner.slug, type: partner.type, branding: partner.branding || {} },
    generatedAt: now.toISOString(),
    totals: {
      pets: totals.pets,
      units: rows.length,
      alDia: totals.al_dia,
      porVencer: totals.por_vencer,
      vencido: totals.vencido,
      sinRegistro: totals.sin_registro,
    },
    complianceRate, // (al día + por vencer) / total — antirrábica vigente hoy
    units: rows.map((u) => ({
      unit: u.unit,
      pets: u.pets,
      status: u.worst,
      statusColor: STATUS[u.worst].color,
      statusLabel: STATUS[u.worst].label,
      byStatus: u.byStatus,
      nextDueDate: u.nextDueDate ? u.nextDueDate.toISOString() : null,
    })),
  };
}

module.exports = { computeCompliance, dogRabiesStatus, STATUS, RABIES_RE };
