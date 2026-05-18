/**
 * Time Utilities
 * 
 * Provides time reference functions for window calculations,
 * boundary checks, and temporal logic.
 */

/**
 * Get current time in UTC
 * 
 * Used by:
 * - Window calculation: now + windowDays
 * - Boundary checks: reminder.dueAt <= now + windowDays
 * - Temporal reference for tests
 * 
 * @returns {Date} Current UTC time
 */
function getUTCNow() {
  return new Date();
}

/**
 * Get UTC now as ISO 8601 string
 * 
 * @returns {string} ISO 8601 UTC timestamp (e.g., "2026-05-14T13:25:00.000Z")
 */
function getUTCNowISO() {
  return new Date().toISOString();
}

/**
 * Calculate the end of look-ahead window
 * 
 * Given a window in days, return the Date when the window ends.
 * Example: now=2026-05-14, window=7 → 2026-05-21
 * 
 * @param {number} windowDays - Number of days to add
 * @param {Date} [fromDate] - Start date (defaults to now)
 * @returns {Date} End of window
 */
function getWindowEnd(windowDays, fromDate = null) {
  const start = fromDate || new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + windowDays);
  return end;
}

/**
 * Check if a date is within the look-ahead window
 * 
 * @param {Date} targetDate - Date to check
 * @param {number} windowDays - Window size in days
 * @param {Date} [fromDate] - Start of window (defaults to now)
 * @returns {boolean} True if targetDate <= now + windowDays
 */
function isWithinWindow(targetDate, windowDays, fromDate = null) {
  const now = fromDate || new Date();
  const windowEnd = getWindowEnd(windowDays, now);
  return targetDate <= windowEnd;
}

/**
 * Check if a date is overdue (in the past and undismissed)
 * 
 * @param {Date} targetDate - Date to check
 * @returns {boolean} True if targetDate < now
 */
function isOverdue(targetDate) {
  const now = new Date();
  return targetDate < now;
}

/**
 * Format a date for display (UTC)
 * 
 * @param {Date} date - Date to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function formatDateUTC(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Format a date and time for display (UTC)
 * 
 * @param {Date} date - Date to format
 * @returns {string} ISO datetime string (YYYY-MM-DDTHH:mm:ssZ)
 */
function formatDateTimeUTC(date) {
  if (!date) return null;
  return date.toISOString();
}

module.exports = {
  getUTCNow,
  getUTCNowISO,
  getWindowEnd,
  isWithinWindow,
  isOverdue,
  formatDateUTC,
  formatDateTimeUTC,
};
