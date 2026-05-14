/**
 * Reminder Sort Service
 * 
 * Provides deterministic sorting for reminders:
 * 1. Primary: by dueAt ascending (earliest/most urgent first)
 * 2. Secondary: by sourceType priority (vaccination < medication < appointment)
 * 3. Tertiary: by sourceId/sourceName for stable ordering
 */

const SOURCE_TYPE_PRIORITY = {
  vaccination: 1,
  deworming: 2,
  medication: 3,
  appointment: 4,
};

/**
 * Sort reminders deterministically
 * 
 * Reminders with the same dueAt are sorted by:
 * - Type priority (vaccination most important)
 * - Record ID/name for stability
 * 
 * @param {Array<Object>} reminders - Array of reminder objects
 * @returns {Array<Object>} Sorted array (doesn't mutate original)
 * 
 * Reminder object structure expected:
 *   - dueAt: Date (timestamp of when reminder is due)
 *   - sourceType: string ('vaccination', 'medication', 'appointment')
 *   - sourceId: string (ID of the source record)
 *   - sourceName: string (optional, name of source record)
 */
function sortReminders(reminders) {
  if (!Array.isArray(reminders)) {
    return [];
  }

  return [...reminders].sort((a, b) => {
    // Primary: compare by dueAt (ascending - earliest first)
    if (a.dueAt && b.dueAt) {
      const timeA = new Date(a.dueAt).getTime();
      const timeB = new Date(b.dueAt).getTime();
      if (timeA !== timeB) {
        return timeA - timeB; // ascending order
      }
    }

    // Secondary: compare by sourceType priority
    const priorityA = SOURCE_TYPE_PRIORITY[a.sourceType] || 999;
    const priorityB = SOURCE_TYPE_PRIORITY[b.sourceType] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Tertiary: compare by sourceId (for stable deterministic ordering)
    const idA = (a.sourceId || '').toString().toLowerCase();
    const idB = (b.sourceId || '').toString().toLowerCase();
    if (idA !== idB) {
      return idA.localeCompare(idB);
    }

    // Quaternary: use sourceName as final tiebreaker
    const nameA = (a.sourceName || '').toString().toLowerCase();
    const nameB = (b.sourceName || '').toString().toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Compare two reminders for relative ordering
 * 
 * @param {Object} a - First reminder
 * @param {Object} b - Second reminder
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareReminders(a, b) {
  const sortedPair = sortReminders([a, b]);
  const aIndex = sortedPair.indexOf(a);
  const bIndex = sortedPair.indexOf(b);
  
  if (aIndex < bIndex) return -1;
  if (aIndex > bIndex) return 1;
  return 0;
}

module.exports = {
  sortReminders,
  compareReminders,
  SOURCE_TYPE_PRIORITY,
};
