'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const EmailService = require('./EmailService');

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
          try {
            await EmailService.sendVaccinationReminder({
              to: user.email,
              userName: user.name,
              dogName: dog.name,
              vaccineName: vax.vaccineName,
              nextDueDate: vax.nextDueDate,
            });
            console.log(`[ReminderJob] Vaccination reminder sent: user=${user._id} dog=${dog._id} vax=${vax._id}`);
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
            await EmailService.sendMedicationReminder({
              to: user.email,
              userName: user.name,
              dogName: dog.name,
              medicationName: med.medicationName,
              dosage: med.dosage,
            });
            console.log(`[ReminderJob] Medication reminder sent: user=${user._id} dog=${dog._id} med=${med._id}`);
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
            await EmailService.sendAppointmentReminder({
              to: user.email,
              userName: user.name,
              dogName: dog.name,
              clinicName: appt.clinicName,
              appointmentDate: appt.appointmentDate,
            });
            console.log(`[ReminderJob] Appointment reminder sent: user=${user._id} dog=${dog._id} appt=${appt._id}`);
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
