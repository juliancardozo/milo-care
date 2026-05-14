import { useI18n } from '../i18n/I18nProvider';

export default function ReminderItem({ reminder }) {
  const { t } = useI18n();
  const dueAt = reminder?.dueAt ? new Date(reminder.dueAt) : null;
  const dueLabel = dueAt ? dueAt.toLocaleString() : '-';
  const isOverdue = reminder?.status === 'overdue';

  return (
    <li className={`record-item reminder-item ${isOverdue ? 'reminder-overdue' : ''}`}>
      <div className="record-info">
        <h3>{reminder.title}</h3>
        <p>{reminder.petName} · {t(`remindersFullList.types.${reminder.sourceType}`)}</p>
        <p>{t('remindersFullList.dueAt')}: {dueLabel}</p>
        {isOverdue && (
          <span className="badge badge-overdue" aria-label={t('remindersFullList.overdueLabel')}>
            {t('remindersFullList.overdueLabel')}
          </span>
        )}
      </div>
    </li>
  );
}
