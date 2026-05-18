import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from '../../utils/dateUtils';

export default function RemindersList({ reminders, onRefresh }) {
  const { t } = useI18n();

  const groupedByDue = reminders.reduce((acc, reminder) => {
    const dueDate = new Date(reminder.dueAt).toLocaleDateString();
    if (!acc[dueDate]) acc[dueDate] = [];
    acc[dueDate].push(reminder);
    return acc;
  }, {});

  return (
    <div className="reminders-list">
      {Object.entries(groupedByDue).map(([dueDate, items]) => (
        <div key={dueDate} className="reminder-group">
          <h3 className="group-date">{dueDate}</h3>
          <div className="items">
            {items.map((reminder, idx) => (
              <div key={idx} className="reminder-item">
                <div className="reminder-icon">
                  {reminder.type === 'vaccination' && '💉'}
                  {reminder.type === 'deworming' && '🦠'}
                  {reminder.type === 'appointment' && '📅'}
                  {reminder.type === 'medication' && '💊'}
                  {reminder.type === 'symptom' && '🏥'}
                </div>
                <div className="reminder-details">
                  <h4>{reminder.dogName}</h4>
                  <p className="description">{reminder.itemDescription}</p>
                  <small>{formatDate(reminder.dueAt)}</small>
                </div>
                <div className="reminder-status">
                  {reminder.sentAt ? (
                    <span className="badge badge-success">✓ Sent</span>
                  ) : (
                    <span className="badge badge-warning">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button className="btn btn-primary mt-3" onClick={onRefresh}>
        {t('common.refresh') || 'Refresh'}
      </button>
    </div>
  );
}
