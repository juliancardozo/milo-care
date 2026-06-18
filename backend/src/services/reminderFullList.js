'use strict';

const { getWindowEnd, getUTCNow } = require('../utils/timeUtils');
const { sortReminders } = require('./reminderSort');

function toReminderItem({ dog, sourceType, source, dueAt, now }) {
  const isOverdue = dueAt < now;

  return {
    id: `${sourceType}:${source._id}`,
    dedupeKey: `${dog._id}:${sourceType}:${source._id}:${new Date(dueAt).toISOString().split('T')[0]}`,
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
    .filter((vax) => !['cancelled', 'discarded'].includes(String(vax.status || '').toLowerCase()))
    .map((vax) => {
      const dueAt = vax.nextDueDate || vax.nextReminderAt || null;
      if (!dueAt) return null;
      if (String(vax.status || '').toLowerCase() === 'pending_vet_validation') return null;
      return toReminderItem({ dog, sourceType: 'vaccination', source: vax, dueAt: new Date(dueAt), now });
    })
    .filter(Boolean);
}

function collectDewormingReminders(dog, now) {
  return (dog.dewormingHistory || [])
    .filter((dew) => !['cancelled', 'discarded'].includes(String(dew.status || '').toLowerCase()))
    .map((dew) => {
      const dueAt = dew.nextDueDate || dew.nextReminderAt || null;
      if (!dueAt) return null;
      if (String(dew.status || '').toLowerCase() === 'pending_vet_validation') return null;
      return toReminderItem({ dog, sourceType: 'deworming', source: dew, dueAt: new Date(dueAt), now });
    })
    .filter(Boolean);
}

function collectMedicationReminders(dog, now) {
  return (dog.medications || [])
    .filter((med) => !['completed', 'cancelled'].includes(String(med.status || '').toLowerCase()) && med.nextReminderAt)
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
    .filter((appt) => !['cancelled', 'discarded'].includes(String(appt.status || '').toLowerCase()))
    .map((appt) => {
      const dueAt = appt.appointmentDate || appt.reminderAt || null;
      if (!dueAt) return null;
      if (String(appt.status || '').toLowerCase() === 'pending_vet_validation') return null;
      return toReminderItem({ dog, sourceType: 'appointment', source: appt, dueAt: new Date(dueAt), now });
    })
    .filter(Boolean);
}

function buildEligibleReminderSet({ user, windowDays, includeOverdue = true, now = getUTCNow() }) {
  const dogs = user?.dogs || [];
  const windowEnd = getWindowEnd(windowDays, now);
  const dismissed = new Set(user?.dismissedReminderKeys || []);

  const allReminders = dogs.flatMap((dog) => [
    ...collectVaccinationReminders(dog, now),
    ...collectDewormingReminders(dog, now),
    ...collectMedicationReminders(dog, now),
    ...collectAppointmentReminders(dog, now),
  ]);

  const deduped = [];
  const seen = new Set();
  for (const item of allReminders) {
    if (seen.has(item.dedupeKey)) continue;
    if (dismissed.has(item.dedupeKey)) continue; // descartado por el usuario
    seen.add(item.dedupeKey);
    deduped.push(item);
  }

  const eligible = deduped.filter((reminder) => {
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
