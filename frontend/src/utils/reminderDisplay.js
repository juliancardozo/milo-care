// Display helpers shared by the full reminders list page and its item cards.
// Keeps icon/color mapping, time-bucketing and relative-date logic in one place.

// Visual identity per reminder source type. `accent` maps to a CSS color token.
export const REMINDER_TYPE_META = {
  vaccination: { icon: '💉', accent: 'var(--color-primary)' },
  deworming:   { icon: '🪱', accent: '#0d9488' },
  medication:  { icon: '💊', accent: '#7c3aed' },
  appointment: { icon: '🩺', accent: '#f59e0b' },
};

export function typeMeta(sourceType) {
  return REMINDER_TYPE_META[sourceType] || { icon: '🔔', accent: 'var(--color-muted)' };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Whole-day difference between a due date and now (negative = past).
export function dayDiff(dueAt, now = new Date()) {
  return Math.round((startOfDay(dueAt) - startOfDay(now)) / 86400000);
}

// Time bucket used to group reminders into sections.
// Uses the backend-provided overdue status (time-precise) before falling back to day math.
export function bucketOf(reminder, now = new Date()) {
  if (reminder.status === 'overdue') return 'overdue';
  const diff = dayDiff(reminder.dueAt, now);
  if (diff <= 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'later';
}

export const BUCKET_ORDER = ['overdue', 'today', 'soon', 'later'];

// Human, translatable relative label (e.g. "En 3 días", "Hace 2 días").
// `t` is the i18n function; keys live under remindersFullList.relative.
export function relativeDueLabel(dueAt, now, t) {
  const diff = dayDiff(dueAt, now);
  if (diff === 0) return t('remindersFullList.relative.today');
  if (diff === 1) return t('remindersFullList.relative.tomorrow');
  if (diff === -1) return t('remindersFullList.relative.yesterday');
  if (diff > 1) return t('remindersFullList.relative.inDays', { n: diff });
  return t('remindersFullList.relative.agoDays', { n: Math.abs(diff) });
}

// Exact, locale-aware date/time for the secondary line.
export function exactDueLabel(dueAt) {
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' });
}
