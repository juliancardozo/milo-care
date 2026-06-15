'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const EmailService = require('./EmailService');
const Notifier = require('./NotificationDispatcher');
const { localHour } = require('../utils/localTime');

const APP = () => Notifier.appUrl();

// Recordatorios basados en fecha (vacuna/desparasitación) se entregan a la hora
// local elegida por el usuario (default 9am), no apenas vencen. Los de medicación
// y citas tienen hora propia (dosis/turno), así que no se gatean.
function isReminderHour(user, now) {
  const tz = user.notificationPreferences?.timezone;
  const hour = user.notificationPreferences?.reminderHour ?? 9;
  return localHour(tz, now) === hour;
}

/**
 * Process vaccination reminders.
 * Queries all users with a vaccination where nextReminderAt <= now and notificationPreferences.enabled = true.
 */
async function processVaccinationReminders(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    'dogs.vaccinations.nextReminderAt': { $lte: now },
  });

  for (const user of users) {
    for (const dog of user.dogs) {
      for (const vax of dog.vaccinations) {
        if (vax.nextReminderAt && vax.nextReminderAt <= now) {
          if (String(vax.status || '').toLowerCase() === 'pending_vet_validation') continue;
          if (['cancelled', 'discarded', 'completed'].includes(String(vax.status || '').toLowerCase())) continue;
          if (!isReminderHour(user, now)) continue; // esperar a la hora local del usuario
          try {
            await Notifier.dispatchToDog(user, dog, (r) => ({
              push: {
                type: 'vaccination',
                title: `💉 Vacuna de ${dog.name}`,
                body: `${vax.vaccineName} está por vencer. Tocá para ver la ficha.`,
                data: { url: `${APP()}/dogs/${dog._id}/vaccinations` },
              },
              email: () => EmailService.sendVaccinationReminder({
                to: r.email,
                userName: r.name,
                dogName: dog.name,
                vaccineName: vax.vaccineName,
                nextDueDate: vax.nextDueDate,
              }),
            }));
            console.log(`[ReminderJob] Vaccination reminder sent: dog=${dog._id} vax=${vax._id}`);
          } catch (err) {
            console.error(`[ReminderJob] Vaccination reminder failed: ${err.message}`);
          }
          vax.nextReminderAt = null; // clear so it doesn't fire again
        }
      }
    }
    await user.save();
  }
}

/**
 * Process medication reminders.
 * Queries active medications with nextReminderAt <= now, advances nextReminderAt by frequencyHours.
 */
async function processMedicationReminders(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    'dogs.medications': {
      $elemMatch: { status: 'active', nextReminderAt: { $lte: now } },
    },
  });

  for (const user of users) {
    for (const dog of user.dogs) {
      for (const med of dog.medications) {
        if (med.status === 'active' && med.nextReminderAt && med.nextReminderAt <= now) {
          try {
            await Notifier.dispatchToDog(user, dog, (r) => ({
              push: {
                type: 'medication',
                title: `💊 Medicación de ${dog.name}`,
                body: `Toca darle ${med.medicationName} (${med.dosage}).`,
                data: { url: `${APP()}/dogs/${dog._id}/medications` },
              },
              email: () => EmailService.sendMedicationReminder({
                to: r.email,
                userName: r.name,
                dogName: dog.name,
                medicationName: med.medicationName,
                dosage: med.dosage,
              }),
            }));
            console.log(`[ReminderJob] Medication reminder sent: dog=${dog._id} med=${med._id}`);
          } catch (err) {
            console.error(`[ReminderJob] Medication reminder failed: ${err.message}`);
          }
          // Advance reminder by frequencyHours
          const next = new Date(med.nextReminderAt);
          next.setHours(next.getHours() + med.frequencyHours);
          med.nextReminderAt = next;
        }
      }
    }
    await user.save();
  }
}

/**
 * Process deworming reminders.
 */
async function processDewormingReminders(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    'dogs.dewormingHistory.nextReminderAt': { $lte: now },
  });

  for (const user of users) {
    for (const dog of user.dogs) {
      for (const dew of dog.dewormingHistory || []) {
        if (!dew.nextReminderAt || dew.nextReminderAt > now) continue;
        const status = String(dew.status || '').toLowerCase();
        if (['pending_vet_validation', 'cancelled', 'discarded', 'completed'].includes(status)) continue;
        if (!isReminderHour(user, now)) continue; // esperar a la hora local del usuario
        try {
          await Notifier.dispatchToDog(user, dog, (r) => ({
            push: {
              type: 'deworming',
              title: `🪱 Desparasitación de ${dog.name}`,
              body: `${dew.productName} está por vencer. Tocá para ver la ficha.`,
              data: { url: `${APP()}/dogs/${dog._id}/history` },
            },
            email: () => EmailService.sendDewormingReminder({
              to: r.email,
              userName: r.name,
              dogName: dog.name,
              productName: dew.productName,
              nextDueDate: dew.nextDueDate,
            }),
          }));
          console.log(`[ReminderJob] Deworming reminder sent: dog=${dog._id} deworm=${dew._id}`);
        } catch (err) {
          console.error(`[ReminderJob] Deworming reminder failed: ${err.message}`);
        }
        dew.nextReminderAt = null;
      }
    }
    await user.save();
  }
}

/**
 * Process appointment reminders.
 * Clears reminderAt after send.
 */
async function processAppointmentReminders(now) {
  const users = await User.find({
    'notificationPreferences.enabled': true,
    'dogs.appointments': {
      $elemMatch: { status: 'upcoming', reminderAt: { $lte: now } },
    },
  });

  for (const user of users) {
    for (const dog of user.dogs) {
      for (const appt of dog.appointments) {
        if (appt.status === 'upcoming' && appt.reminderAt && appt.reminderAt <= now) {
          try {
            const apptTitle = appt.title || appt.clinicName || 'Consulta veterinaria';
            await Notifier.dispatchToDog(user, dog, (r) => ({
              push: {
                type: 'appointment',
                title: `🩺 Cita de ${dog.name}`,
                body: `${apptTitle} — no te la olvides. Tocá para ver los detalles.`,
                data: { url: `${APP()}/dogs/${dog._id}/appointments` },
              },
              email: () => EmailService.sendAppointmentReminder({
                to: r.email,
                userName: r.name,
                dogName: dog.name,
                appointmentTitle: apptTitle,
                clinicName: appt.clinicName || appt.vetName || '',
                appointmentDate: appt.appointmentDate,
              }),
            }));
            console.log(`[ReminderJob] Appointment reminder sent: dog=${dog._id} appt=${appt._id}`);
          } catch (err) {
            console.error(`[ReminderJob] Appointment reminder failed: ${err.message}`);
          }
          appt.reminderAt = null; // clear so it doesn't fire again
        }
      }
    }
    await user.save();
  }
}

/**
 * Run all reminder processors.
 */
async function runReminders() {
  const now = new Date();
  console.log(`[ReminderJob] Running at ${now.toISOString()}`);
  try {
    await Promise.all([
      processVaccinationReminders(now),
      processDewormingReminders(now),
      processMedicationReminders(now),
      processAppointmentReminders(now),
    ]);
  } catch (err) {
    console.error('[ReminderJob] Unexpected error:', err.message);
  }
}

/**
 * Start the cron-based reminder scheduler (every 5 minutes).
 */
function startReminderJob() {
  cron.schedule('*/5 * * * *', runReminders);
  console.log('[ReminderJob] Scheduler started — running every 5 minutes.');
}

module.exports = { startReminderJob, runReminders };
