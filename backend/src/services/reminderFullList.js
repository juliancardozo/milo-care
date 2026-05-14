'use strict';

const { getWindowEnd, getUTCNow } = require('../utils/timeUtils');
const { sortReminders } = require('./reminderSort');

function toReminderItem({ dog, sourceType, source, dueAt, now }) {
  const isOverdue = dueAt < now;

  return {
    id: `${sourceType}:${source._id}`,
    sourceType,
    sourceId: source._id?.toString?.() || String(source._id || ''),
    sourceName:
      source.vaccineName || source.medicationName || source.clinicName || source.title || '',
    petId: dog._id?.toString?.() || String(dog._id || ''),
    petName: dog.name,
    title: source.vaccineName || source.medicationName || source.clinicName || 'Reminder',
    subtitle: source.notes || null,
    dueAt,
    status: isOverdue ? 'overdue' : 'upcoming',
    priority: isOverdue ? 'high' : 'medium',
    guidanceText: 'This is an informational reminder. Please consult your trusted veterinarian.',
  };
}

function collectVaccinationReminders(dog, now) {
  return (dog.vaccinations || [])
    .map((vax) => {
      const dueAt = vax.nextDueDate || vax.nextReminderAt || null;
      if (!dueAt) return null;
      return toReminderItem({ dog, sourceType: 'vaccination', source: vax, dueAt: new Date(dueAt), now });
    })
    .filter(Boolean);
}

function collectMedicationReminders(dog, now) {
  return (dog.medications || [])
    .filter((med) => med.status !== 'completed' && med.nextReminderAt)
    .map((med) =>
      toReminderItem({
        dog,
        sourceType: 'medication',
        source: med,
        dueAt: new Date(med.nextReminderAt),
        now,
      })
    );
}

function collectAppointmentReminders(dog, now) {
  return (dog.appointments || [])
    .filter((appt) => appt.status !== 'cancelled')
    .map((appt) => {
      const dueAt = appt.appointmentDate || appt.reminderAt || null;
      if (!dueAt) return null;
      return toReminderItem({ dog, sourceType: 'appointment', source: appt, dueAt: new Date(dueAt), now });
    })
    .filter(Boolean);
}

function buildEligibleReminderSet({ user, windowDays, includeOverdue = true, now = getUTCNow() }) {
  const dogs = user?.dogs || [];
  const windowEnd = getWindowEnd(windowDays, now);

  const allReminders = dogs.flatMap((dog) => [
    ...collectVaccinationReminders(dog, now),
    ...collectMedicationReminders(dog, now),
    ...collectAppointmentReminders(dog, now),
  ]);

  const eligible = allReminders.filter((reminder) => {
    const dueAt = new Date(reminder.dueAt);
    const isOverdue = dueAt < now;
    if (isOverdue) {
      return includeOverdue;
    }
    return dueAt <= windowEnd;
  });

  return sortReminders(eligible);
}

module.exports = {
  buildEligibleReminderSet,
};
