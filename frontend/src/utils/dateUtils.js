/**
 * Format a date string or Date object to local date format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date (YYYY-MM-DD)
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date to a human-readable string
 * @param {string|Date} date - The date to format
 * @returns {string} Human-readable date (e.g., "15 de mayo de 2026")
 */
export function formatDateLong(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date to ISO format (YYYY-MM-DD)
 * @param {string|Date} date - The date to format
 * @returns {string} ISO date format
 */
export function formatDateISO(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Get the age in years and months
 * @param {string|Date} birthDate - The birth date
 * @returns {string} Age as "X years Y months"
 */
export function calculateAge(birthDate) {
  if (!birthDate) return 'Unknown';
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years}y ${remainingMonths}m`;
}

/**
 * Check if a date is in the past
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

/**
 * Check if a date is today
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false;
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is within X days
 * @param {string|Date} date - The date to check
 * @param {number} days - Number of days
 * @returns {boolean} True if date is within X days
 */
export function isWithinDays(date, days) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diffTime = d - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}
