import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

export default function ReminderNotificationBanner({ items, onDismiss }) {
  const { t } = useI18n();
  const [snoozeHours, setSnoozeHours] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="reminder-banner alert alert-info">
      <div className="banner-content">
        <h3>🔔 {t('reminders.dueToday') || 'Due Today'}</h3>
        <ul className="due-items">
          {items.slice(0, 3).map((item, idx) => (
            <li key={idx}>
              <strong>{item.dogName}</strong> — {item.itemDescription}
            </li>
          ))}
          {items.length > 3 && <li>... and {items.length - 3} more</li>}
        </ul>
      </div>
      <div className="banner-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setSnoozeHours(24)}
        >
          {t('reminders.snooze') || 'Snooze 24h'}
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onDismiss}
        >
          {t('common.dismiss') || 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
