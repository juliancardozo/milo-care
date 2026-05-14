/**
 * Window Resolution Service
 * 
 * Implements look-ahead window precedence logic:
 * 1. Temporary current-view override parameter (highest priority)
 * 2. Saved user preference (medium priority)
 * 3. Default 7-day window (lowest priority)
 * 
 * Also handles invalid window value fallback with user-facing explanation.
 */

const WINDOW_BOUNDS = {
  MIN: 1,
  MAX: 60,
  DEFAULT: 7,
};

/**
 * Resolve the look-ahead window based on precedence rules
 * 
 * @param {Object} input
 * @param {number|null} input.tempWindowDays - Temporary override (e.g., from query param)
 * @param {number|null} input.userPreference - User's saved window preference
 * @param {Date} input.now - Current time (for appliedAt timestamp)
 * 
 * @returns {Object}
 *   - windowDays: Resolved window value (1-60)
 *   - windowSource: 'temporary-override', 'user-preference', or 'default'
 *   - appliedAt: ISO timestamp when resolution occurred
 *   - fallbackReason: (optional) Explanation if fallback to default occurred
 */
function resolveWindow({ tempWindowDays, userPreference, now }) {
  let windowDays = null;
  let windowSource = null;
  let fallbackReason = null;

  // Step 1: Check temporary override (highest priority)
  if (tempWindowDays !== null && tempWindowDays !== undefined) {
    if (isValidWindow(tempWindowDays)) {
      windowDays = tempWindowDays;
      windowSource = 'temporary-override';
    } else {
      // Invalid temporary override - provide explanation and fall through
      fallbackReason = generateFallbackExplanation(tempWindowDays);
    }
  }

  // Step 2: Check user preference (if no valid override)
  if (windowDays === null && userPreference !== null && userPreference !== undefined) {
    if (isValidWindow(userPreference)) {
      windowDays = userPreference;
      windowSource = 'user-preference';
    } else {
      // Invalid preference - provide explanation and fall through
      if (!fallbackReason) {
        fallbackReason = generateFallbackExplanation(userPreference);
      }
    }
  }

  // Step 3: Apply default (if no valid override or preference)
  if (windowDays === null) {
    windowDays = WINDOW_BOUNDS.DEFAULT;
    windowSource = 'default';
  }

  const appliedAt = now || new Date();

  const result = {
    windowDays,
    windowSource,
    appliedAt: appliedAt instanceof Date ? appliedAt : new Date(appliedAt),
  };

  if (fallbackReason) {
    result.fallbackReason = fallbackReason;
  }

  return result;
}

/**
 * Check if a window value is within valid bounds (1-60 days)
 * 
 * @param {*} value - Value to validate
 * @returns {boolean} True if 1 <= value <= 60
 */
function isValidWindow(value) {
  // Check for non-numeric values (NaN, undefined, null, strings, etc.)
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }

  // Check bounds
  if (value < WINDOW_BOUNDS.MIN || value > WINDOW_BOUNDS.MAX) {
    return false;
  }

  // Check if integer (allow floats that are effectively integers like 5.0)
  if (!Number.isInteger(value)) {
    return false;
  }

  return true;
}

/**
 * Generate user-facing explanation for fallback to default window
 * 
 * @param {*} invalidValue - The invalid window value that was rejected
 * @returns {string} User-facing explanation message
 */
function generateFallbackExplanation(invalidValue) {
  if (invalidValue === null || invalidValue === undefined) {
    return `Invalid window value. Using default 7 days.`;
  }

  if (typeof invalidValue === 'number') {
    if (invalidValue < WINDOW_BOUNDS.MIN) {
      return `Window value ${invalidValue} is too small (minimum 1 day). Using default 7 days.`;
    }
    if (invalidValue > WINDOW_BOUNDS.MAX) {
      return `Window value ${invalidValue} exceeds maximum (60 days). Using default 7 days.`;
    }
    if (isNaN(invalidValue)) {
      return `Invalid window value (NaN). Using default 7 days.`;
    }
  }

  return `Invalid window value. Using default 7 days.`;
}

module.exports = {
  resolveWindow,
  isValidWindow,
  generateFallbackExplanation,
  WINDOW_BOUNDS,
};
