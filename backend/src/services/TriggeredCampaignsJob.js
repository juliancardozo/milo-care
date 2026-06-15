'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const DailyCheckin = require('../models/DailyCheckin');
const EmailService = require('./EmailService');
const Notifier = require('./NotificationDispatcher');
const { localHour, localDateString } = require('../utils/localTime');

/**
 * Campañas disparadas (Fase 3 — Notifications 2.0).
 *
 * A diferencia de los recordatorios programados (ReminderJob, basados en
 * nextReminderAt), estas reaccionan al ESTADO del perro:
 *   1. Vencidos: vacuna/desparasitación con el último vencimiento ya pasado.
 *   2. Re-engagement: hace ≥7 días que el usuario no hace check-in.
 *
 * Corre cada hora y se entrega a la hora local del usuario (reminderHour), con
 * idempotencia para no repetir (cadencia de escalado de 14 días en vencidos;
 * cooldown de 7 días en re-engagement).
 */

const APP = () => Notifier.appUrl();
const OVERDUE_RENOTIFY_MS = 14 * 86400000; // re-escalar vencidos cada 14 días
const REENGAGE_AFTER_DAYS = 7;             // sin check-in hace ≥7 días
const REENGAGE_COOLDOWN_DAYS = 7;          // ≤1 nudge por semana

function isReminderHour(user, now) {
  const tz = user.notificationPreferences?.timezone;
  const hour = user.notificationPreferences?.reminderHour ?? 9;
  return localHour(tz, now) === hour;
}

function daysBetweenLocalDates(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number);
  const [by, bm, bd] = String(b).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// El ítem "vencido" de una colección = el de mayor nextDueDate, si ya pasó.
// Espeja la lógica de healthScore (señal a nivel perro), por consistencia con
// el puntaje que el usuario ya ve.
function latestOverdueItem(items, now) {
  const withDue = (items || []).filter((it) => it.nextDueDate);
  if (!withDue.length) return null;
  const latest = withDue.reduce((a, b) => (new Date(a.nextDueDate) >= new Date(b.nextDueDate) ? a : b));
  return new Date(latest.nextDueDate) < now ? latest : null;
}

// ── 1) Campaña de vencidos ───────────────────────────────────────────────────
async function processOverdue(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    $or: [
      { 'dogs.vaccinations.nextDueDate': { $lte: now } },
      { 'dogs.dewormingHistory.nextDueDate': { $lte: now } },
    ],
  });

  for (const user of users) {
    if (!isReminderHour(user, now)) continue;
    let changed = false;

    for (const dog of user.dogs) {
      const candidates = [
        { item: latestOverdueItem(dog.vaccinations, now), kind: 'vaccination' },
        { item: latestOverdueItem(dog.dewormingHistory, now), kind: 'deworming' },
      ];

      for (const { item, kind } of candidates) {
        if (!item) continue;
        if (item.overdueNotifiedAt && (now - new Date(item.overdueNotifiedAt)) < OVERDUE_RENOTIFY_MS) continue;

        const name = kind === 'deworming' ? item.productName : item.vaccineName;
        const path = kind === 'deworming' ? 'history' : 'vaccinations';
        const label = kind === 'deworming' ? 'desparasitación' : 'vacuna';
        try {
          await Notifier.dispatchToDog(user, dog, (r) => ({
            push: {
              type: 'overdue',
              title: `⚠️ ${dog.name}: ${label} atrasada`,
              body: `${name} está vencida. Tocá para ponerla al día.`,
              data: { url: `${APP()}/dogs/${dog._id}/${path}` },
            },
            email: () => EmailService.sendOverdueCare({
              to: r.email, userName: r.name, dogName: dog.name, itemName: name, kind, dueDate: item.nextDueDate,
            }),
          }));
          item.overdueNotifiedAt = now;
          changed = true;
        } catch (err) {
          console.error(`[Campaigns] overdue failed: dog=${dog._id} ${err.message}`);
        }
      }
    }

    if (changed) await user.save();
  }
}

// ── 2) Re-engagement por inactividad de check-in ─────────────────────────────
async function processReengagement(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    'dogs.0': { $exists: true },
  });

  for (const user of users) {
    const prefs = user.notificationPreferences || {};
    if (prefs.checkinEnabled === false) continue; // no naggear sobre algo que apagó
    if (!isReminderHour(user, now)) continue;

    const today = localDateString(prefs.timezone, now);
    if (prefs.lastReengagementOn && daysBetweenLocalDates(prefs.lastReengagementOn, today) < REENGAGE_COOLDOWN_DAYS) continue;

    const lastCheckin = await DailyCheckin.findOne({ userId: user._id }).sort({ createdAt: -1 }).select('createdAt').lean();
    const daysSince = lastCheckin ? (now - new Date(lastCheckin.createdAt)) / 86400000 : Infinity;
    if (daysSince < REENGAGE_AFTER_DAYS) continue;

    const dog = user.dogs[0];
    try {
      // Re-engagement es por cuenta (no se naggea a co-tutores por inactividad ajena).
      await Notifier.dispatchToUser(user, {
        dogId: dog._id,
        push: {
          type: 'reengagement',
          title: `🐾 ¿Cómo está ${dog.name}?`,
          body: `Hace unos días que no sabemos de ${dog.name}. Tocá para un check-in rápido.`,
          data: { url: `${APP()}/dashboard` },
        },
        email: () => EmailService.sendReengagement({ to: user.email, userName: user.name, dogName: dog.name }),
      });
      user.notificationPreferences.lastReengagementOn = today;
      await user.save();
    } catch (err) {
      console.error(`[Campaigns] reengagement failed: user=${user._id} ${err.message}`);
    }
  }
}

async function runTriggeredCampaigns(now = new Date()) {
  console.log(`[Campaigns] Running at ${now.toISOString()}`);
  try {
    await processOverdue(now);
    await processReengagement(now);
  } catch (err) {
    console.error('[Campaigns] Unexpected error:', err.message);
  }
}

function startTriggeredCampaignsJob() {
  cron.schedule('0 * * * *', () => runTriggeredCampaigns()); // cada hora (el gate de hora local hace el resto)
  console.log('[Campaigns] Scheduler started — running hourly.');
}

module.exports = {
  startTriggeredCampaignsJob,
  runTriggeredCampaigns,
  processOverdue,
  processReengagement,
};
