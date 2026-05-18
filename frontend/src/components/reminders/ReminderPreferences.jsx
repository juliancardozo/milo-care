import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

export default function ReminderPreferences({ preferences, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState(preferences || {});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reminder-preferences-section">
      <form onSubmit={handleSubmit} className="preferences-form">
        <h3>{t('reminders.preferences') || 'Reminder Preferences'}</h3>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.emailReminders !== false}
              onChange={(e) =>
                setForm({ ...form, emailReminders: e.target.checked })
              }
            />
            {t('reminders.emailNotifications') || 'Email Notifications'}
          </label>
          <small>
            {t('reminders.emailDesc') ||
              'Receive email reminders for upcoming events'}
          </small>
        </div>

        <div className="form-group">
          <label>{t('reminders.reminderWindow') || 'Reminder Window'}</label>
          <select
            value={form.reminderWindowDays || 7}
            onChange={(e) =>
              setForm({
                ...form,
                reminderWindowDays: parseInt(e.target.value),
              })
            }
          >
            <option value={1}>1 day before</option>
            <option value={3}>3 days before</option>
            <option value={7}>7 days before</option>
            <option value={14}>14 days before</option>
          </select>
          <small>
            {t('reminders.windowDesc') ||
              'When to send reminders before due date'}
          </small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.whatsappOptIn || false}
              onChange={(e) =>
                setForm({ ...form, whatsappOptIn: e.target.checked })
              }
            />
            {t('reminders.whatsappOptIn') || 'WhatsApp Reminders (Manual)'}
          </label>
          <small>
            {t('reminders.whatsappDesc') ||
              'Opt-in to receive WhatsApp messages when reminders are due'}
          </small>
        </div>

        {form.whatsappOptIn && (
          <div className="form-group">
            <label>{t('reminders.phone') || 'WhatsApp Phone Number'}</label>
            <input
              type="tel"
              value={form.whatsappPhone || ''}
              onChange={(e) =>
                setForm({ ...form, whatsappPhone: e.target.value })
              }
              placeholder="+54 9 1234 567890"
            />
            <small>
              {t('reminders.phoneDesc') || 'Include country code'}
            </small>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
