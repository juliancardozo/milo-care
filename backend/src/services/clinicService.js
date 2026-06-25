'use strict';

const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Clinic = require('../models/Clinic');
const referralService = require('./referralService');
const { computeHealthScore } = require('./healthScore');
const { emitEvent } = require('../core/events/eventBus');

/**
 * Kit de Activación Veterinaria — lógica de clínicas, atribución y panel.
 *
 * Atribución (espejo del programa de referidos): el dueño entra por el QR/link
 * `/c/:slug`, queda vinculado a la clínica si el alta ocurre dentro de la ventana
 * de 7 días. Sin código de clínica → sin atribución. La Capa 2 (mes premium gratis)
 * se otorga al "activarse" (confirmar el primer perro), una sola vez.
 */

const ATTRIBUTION_WINDOW_DAYS = 7;
const SALT_ROUNDS = 12;
// Estimación declarada de minutos ahorrados por paciente activo (reconstruir historial).
const MIN_SAVED_PER_ACTIVE = 5;

function appUrl() {
  return (process.env.APP_URL || 'https://milocare.online').replace(/\/+$/, '');
}

function slugify(name) {
  return String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'clinica';
}

async function generateUniqueSlug(name) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await Clinic.findOne({ slug: candidate }).select('_id').lean();
    if (!existing) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function clinicLink(clinic) {
  return `${appUrl()}/c/${clinic.slug}`;
}

/** Copy sugerido para que el vet comparta su link por WhatsApp. */
function whatsappCopy(clinic) {
  const link = clinicLink(clinic);
  return `Para que no se te pase ninguna vacuna ni dosis de tu perro 🐾, cargá su carnet acá: ${link}. Así lo veo al día en cada visita. — ${clinic.name}`;
}

function publicView(clinic) {
  return {
    name: clinic.name,
    slug: clinic.slug,
    logoUrl: clinic.logoUrl || null,
    brandColor: clinic.brandColor || null,
    city: clinic.city || '',
    country: clinic.country || 'AR',
  };
}

async function resolveBySlug(slug) {
  if (!slug) return null;
  return Clinic.findOne({ slug: String(slug).toLowerCase().trim(), active: true });
}

/**
 * Crea (o reutiliza) el usuario vet dueño y la clínica. Vía admin del piloto.
 * Si `ownerEmail`/`ownerPassword` vienen, asegura un usuario rol 'vet'.
 * @returns {Promise<{ clinic, ownerVet|null }>}
 */
async function createClinic(data, { source = 'admin' } = {}) {
  const slug = data.slug ? slugify(data.slug) : await generateUniqueSlug(data.name);

  let ownerVet = null;
  if (data.ownerEmail) {
    const email = String(data.ownerEmail).toLowerCase().trim();
    ownerVet = await User.findOne({ email });
    if (!ownerVet) {
      if (!data.ownerPassword || data.ownerPassword.length < 8) {
        const err = new Error('ownerPassword (≥8) is required to create a new vet user.');
        err.statusCode = 400;
        throw err;
      }
      const passwordHash = await bcrypt.hash(data.ownerPassword, SALT_ROUNDS);
      ownerVet = await User.create({
        name: data.ownerName || data.name,
        email,
        passwordHash,
        role: 'vet',
        referralCode: await referralService.generateUniqueCode(),
      });
    } else if (ownerVet.role === 'user') {
      // Promover a vet sin tocar admin/adminVet existentes.
      ownerVet.role = 'vet';
      await ownerVet.save();
    }
  }

  const clinic = await Clinic.create({
    name: data.name,
    slug,
    logoUrl: data.logoUrl || null,
    brandColor: data.brandColor || null,
    cohort: data.cohort || null,
    ownerVetUserId: ownerVet ? ownerVet._id : null,
    country: data.country || 'AR',
    city: data.city || '',
    whatsapp: data.whatsapp || '',
    contactEmail: data.contactEmail || (ownerVet ? ownerVet.email : ''),
    incentivePremiumDays: data.incentivePremiumDays != null ? data.incentivePremiumDays : 30,
  });

  emitEvent({ type: 'clinic.registered', userId: ownerVet ? ownerVet._id : null, payload: { source } })
    .catch((err) => console.error('[clinic] registered event failed:', err.message));

  return { clinic, ownerVet };
}

/**
 * Atribuye un signup a una clínica si entró por su link dentro de la ventana de
 * 7 días. No bloquea el registro: si no valida, no hace nada.
 * @returns {Promise<boolean>} true si quedó atribuido.
 */
async function attributeSignup({ user, clinicSlug, capturedAt, src = 'unknown', now = new Date() }) {
  if (!user || !clinicSlug) return false;

  // Ventana de 7 días desde la captura del link (si se conoce).
  if (capturedAt) {
    const captured = new Date(capturedAt);
    if (!Number.isNaN(captured.getTime())) {
      const ageDays = (now.getTime() - captured.getTime()) / 86400000;
      if (ageDays > ATTRIBUTION_WINDOW_DAYS || ageDays < 0) return false;
    }
  }

  const clinic = await resolveBySlug(clinicSlug);
  if (!clinic) return false;

  user.acquisitionClinicId = clinic._id;
  user.acquisitionClinicAt = now;
  await user.save();

  const source = ['qr', 'link'].includes(src) ? src : 'unknown';
  emitEvent({ type: 'clinic.signup', userId: user._id, payload: { src: source } })
    .catch((err) => console.error('[clinic] signup event failed:', err.message));

  return true;
}

/**
 * Capa 2 del incentivo: al activarse (confirmar el primer perro), si el usuario
 * fue atribuido a una clínica con incentivo, otorga premium una sola vez.
 * Idempotente. @returns {Promise<{ granted: boolean, days?: number }>}
 */
async function grantClinicIncentiveOnActivation(user, now = new Date()) {
  if (!user || !user.acquisitionClinicId || user.clinicIncentiveGrantedAt) {
    return { granted: false };
  }
  const clinic = await Clinic.findById(user.acquisitionClinicId).lean();
  if (!clinic || !clinic.incentivePremiumDays) return { granted: false };

  user.grantPremiumDays(clinic.incentivePremiumDays, now);
  user.clinicIncentiveGrantedAt = now;
  await user.save();

  emitEvent({ type: 'clinic.activated', userId: user._id, payload: {} })
    .catch((err) => console.error('[clinic] activated event failed:', err.message));

  return { granted: true, days: clinic.incentivePremiumDays };
}

// ── Panel del vet ──────────────────────────────────────────────────────────

function startOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Lunes 00:00 de la semana de `date` (para los buckets semanales).
function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return d;
}

function dogIsUpToDate(dog, now) {
  const { factors } = computeHealthScore(dog, { now });
  const byKey = Object.fromEntries(factors.map((f) => [f.key, f]));
  return byKey.vaccines?.status === 'good' && byKey.deworming?.status === 'good';
}

// Próximo vencimiento (vacuna o desparasitación) dentro de `windowDays` o ya vencido.
function dueSoonItems(dog, now, windowDays = 30) {
  const horizon = now.getTime() + windowDays * 86400000;
  const items = [];
  const collect = (records, label) => {
    (records || []).forEach((r) => {
      if (!r.nextDueDate) return;
      const due = new Date(r.nextDueDate);
      if (due.getTime() <= horizon) {
        items.push({ what: label, name: r.vaccineName || r.productName || label, dueAt: due, overdue: due.getTime() < now.getTime() });
      }
    });
  };
  collect(dog.vaccinations, 'vacuna');
  collect(dog.dewormingHistory, 'desparasitación');
  return items;
}

/**
 * Métricas del panel para una clínica. Itera los usuarios atribuidos (N chico en
 * el piloto) y sus perros embebidos.
 */
async function computePanel(clinic, { now = new Date() } = {}) {
  const users = await User.find({ acquisitionClinicId: clinic._id })
    .select('name acquisitionClinicAt dogs')
    .lean();

  const monthStart = startOfMonth(now);
  let referidosMes = 0;
  let activos = 0;
  let alDia = 0;
  const dueList = [];

  // Buckets de las últimas 4 semanas (S1 más vieja → S4 esta semana).
  const thisWeekStart = startOfWeek(now);
  const weekBuckets = [3, 2, 1, 0].map((back) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - back * 7);
    return { start, count: 0 };
  });

  users.forEach((u) => {
    if (u.acquisitionClinicAt && new Date(u.acquisitionClinicAt) >= monthStart) referidosMes += 1;

    if (u.acquisitionClinicAt) {
      const at = new Date(u.acquisitionClinicAt).getTime();
      for (let i = weekBuckets.length - 1; i >= 0; i--) {
        if (at >= weekBuckets[i].start.getTime()) { weekBuckets[i].count += 1; break; }
      }
    }

    const dogs = u.dogs || [];
    if (dogs.length > 0) activos += 1;

    const ownerFirstName = (u.name || '').trim().split(/\s+/)[0] || '';
    dogs.forEach((dog) => {
      if (dogIsUpToDate(dog, now)) alDia += 1;
      dueSoonItems(dog, now).forEach((item) => {
        dueList.push({ ownerFirstName, dogName: dog.name, what: item.what, name: item.name, dueAt: item.dueAt, overdue: item.overdue });
      });
    });
  });

  dueList.sort((a, b) => a.dueAt - b.dueAt);

  return {
    clinic: { name: clinic.name, slug: clinic.slug, logoUrl: clinic.logoUrl || null, brandColor: clinic.brandColor || null, cohort: clinic.cohort || null },
    link: clinicLink(clinic),
    whatsappCopy: whatsappCopy(clinic),
    stats: {
      referidosTotal: users.length,
      referidosMes,
      activos,
      alDia,
      minutosAhorrados: activos * MIN_SAVED_PER_ACTIVE,
    },
    weekly: weekBuckets.map((b, idx) => ({ label: `S${idx + 1}`, count: b.count })),
    dueSoon: dueList.slice(0, 50),
  };
}

/**
 * Pacientes de la clínica con sus ítems atestables (vacunas/desparasitación
 * aplicadas) y el estado de validación. Aislamiento por cohorte: solo perros de
 * usuarios atribuidos a ESTA clínica. Solo agregados/ítems del expediente — no
 * expone datos sensibles del tutor más allá del nombre de pila.
 */
async function listAttestablePatients(clinic) {
  const users = await User.find({ acquisitionClinicId: clinic._id })
    .select('name dogs')
    .lean();

  const patients = [];
  users.forEach((u) => {
    const ownerFirstName = (u.name || '').trim().split(/\s+/)[0] || '';
    (u.dogs || []).forEach((dog) => {
      const mapItem = (r, kind) => ({
        kind,
        itemId: String(r._id),
        name: r.vaccineName || r.productName,
        dateAdministered: r.dateAdministered || null,
        vetValidatedAt: r.vetValidatedAt || null,
      });
      const vaccinations = (dog.vaccinations || []).filter((v) => v.dateAdministered).map((v) => mapItem(v, 'vaccination'));
      const deworming = (dog.dewormingHistory || []).filter((d) => d.dateAdministered).map((d) => mapItem(d, 'deworming'));
      if (vaccinations.length || deworming.length) {
        patients.push({ dogId: String(dog._id), dogName: dog.name, ownerFirstName, vaccinations, deworming });
      }
    });
  });

  return patients;
}

module.exports = {
  ATTRIBUTION_WINDOW_DAYS,
  MIN_SAVED_PER_ACTIVE,
  slugify,
  generateUniqueSlug,
  clinicLink,
  whatsappCopy,
  publicView,
  resolveBySlug,
  createClinic,
  attributeSignup,
  grantClinicIncentiveOnActivation,
  computePanel,
  listAttestablePatients,
};
