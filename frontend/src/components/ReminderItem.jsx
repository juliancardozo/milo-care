import { useI18n } from '../i18n/I18nProvider';
import { typeMeta, relativeDueLabel, exactDueLabel } from '../utils/reminderDisplay';

export default function ReminderItem({ reminder, now, onDismiss }) {
  const { t } = useI18n();
  const ref = now ? new Date(now) : new Date();
  const meta = typeMeta(reminder.sourceType);
  const isOverdue = reminder?.status === 'overdue';

  return (
    <li
      className={`rfl-item ${isOverdue ? 'rfl-item-overdue' : ''}`}
      style={{ '--rfl-accent': meta.accent }}
    >
      <span className="rfl-item-icon" aria-hidden="true">{meta.icon}</span>

      <div className="rfl-item-body">
        <div className="rfl-item-head">
          <h3 className="rfl-item-title">{reminder.title}</h3>
          {isOverdue && (
            <span className="rfl-badge rfl-badge-overdue">{t('remindersFullList.overdueLabel')}</span>
          )}
        </div>

        <div className="rfl-item-meta">
          <span className="rfl-chip rfl-chip-pet">🐾 {reminder.petName}</span>
          <span className="rfl-chip">{t(`remindersFullList.types.${reminder.sourceType}`)}</span>
        </div>

        {reminder.subtitle && <p className="rfl-item-sub">{reminder.subtitle}</p>}
      </div>

      <div className="rfl-item-due">
        <span className={`rfl-due-rel ${isOverdue ? 'rfl-due-rel-overdue' : ''}`}>
          {relativeDueLabel(reminder.dueAt, ref, t)}
        </span>
        <span className="rfl-due-exact">{exactDueLabel(reminder.dueAt)}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="rfl-item-dismiss"
          onClick={() => onDismiss(reminder)}
          aria-label={t('remindersFullList.dismiss')}
          title={t('remindersFullList.dismiss')}
        >
          ✕
        </button>
      )}
    </li>
  );
}
