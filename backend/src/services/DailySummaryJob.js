'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const SlackService = require('./SlackService');

const DAY_MS = 24 * 60 * 60 * 1000;
// Grant estándar de Premium por pago aprobado (ver billing.js). Se usa para inferir
// upgrades/renovaciones recientes a partir de premiumUntil (no hay log de tier).
const PREMIUM_DAYS_PER_PAYMENT = 31;

/**
 * Calcula las métricas del resumen diario a partir de la DB.
 *
 * Notas de fidelidad (el modelo no persiste un historial de cambios de tier ni de
 * bajas — las cuentas se borran en duro):
 *   - newUsers24h / newDogs24h: exactos, vía createdAt (User y subdoc dog).
 *   - upgrades24h: aproximación. Un pago otorga ~31 días, así que un premiumUntil
 *     ≥ now + (31 días − ventana) implica una concesión reciente (upgrade o
 *     renovación). Directional, no exacto.
 *   - downgrades24h: cancelaciones con cancelRequestedAt en la ventana (señal real).
 *   - accountsDeleted24h: null → no derivable de Mongo (borrado en duro). El aviso
 *     en tiempo real de #milo-alertas cubre cada baja.
 */
async function computeSummary(now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  // Umbral de premiumUntil que implica una concesión en las últimas ~24h.
  const upgradeThreshold = new Date(now.getTime() + (PREMIUM_DAYS_PER_PAYMENT * DAY_MS) - DAY_MS);

  const [newUsers24h, newDogsAgg, upgrades24h, downgrades24h, totalUsers, totalDogsAgg, premiumUsers] =
    await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      User.aggregate([
        { $unwind: '$dogs' },
        { $match: { 'dogs.createdAt': { $gte: since } } },
        { $count: 'total' },
      ]),
      User.countDocuments({ premiumUntil: { $gte: upgradeThreshold } }),
      User.countDocuments({ cancelRequestedAt: { $gte: since } }),
      User.countDocuments({}),
      User.aggregate([
        { $project: { dogCount: { $size: { $ifNull: ['$dogs', []] } } } },
        { $group: { _id: null, total: { $sum: '$dogCount' } } },
      ]),
      User.countDocuments({ $or: [{ tier: 'premium' }, { premiumUntil: { $gt: now } }] }),
    ]);

  const totalDogs = totalDogsAgg[0]?.total ?? 0;
  const pctPremium = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;

  return {
    newUsers24h,
    newDogs24h: newDogsAgg[0]?.total ?? 0,
    upgrades24h,
    downgrades24h,
    accountsDeleted24h: null,
    totalUsers,
    totalDogs,
    pctPremium,
  };
}

/** Calcula y envía el resumen diario a Slack. No lanza ante fallo. */
async function runDailySummary(now = new Date()) {
  try {
    if (!SlackService.isEnabled()) return;
    const summary = await computeSummary(now);
    await SlackService.notifyDailySummary(summary);
    console.log('[DailySummaryJob] Daily summary sent to Slack.');
  } catch (err) {
    console.error(`[DailySummaryJob] Failed: ${err.message}`);
  }
}

/** Programa el resumen a las 09:00 hora de Argentina. */
function startDailySummaryJob() {
  cron.schedule('0 9 * * *', () => runDailySummary(), {
    timezone: 'America/Argentina/Buenos_Aires',
  });
  console.log('[DailySummaryJob] Scheduler started — 09:00 America/Argentina/Buenos_Aires.');
}

module.exports = { startDailySummaryJob, runDailySummary, computeSummary };
