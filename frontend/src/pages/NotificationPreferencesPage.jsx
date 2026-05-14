import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import BackLink from '../components/BackLink';
import { selectCurrentUser, updateUser } from '../store/authSlice';
import { updateNotificationPreferences } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function NotificationPreferencesPage() {
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const prefs = user?.notificationPreferences || { enabled: true, vaccinationWindowDays: 7, appointmentWindowHours: 24 };

  const [form, setForm] = useState({
    enabled: prefs.enabled,
    vaccinationWindowDays: prefs.vaccinationWindowDays,
    appointmentWindowHours: prefs.appointmentWindowHours,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const { data } = await updateNotificationPreferences(form);
      dispatch(updateUser({ notificationPreferences: data.notificationPreferences }));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('notifications.errors.save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <BackLink />
      <h1>{t('notifications.title')}</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            {t('notifications.enableEmail')}
          </label>
        </div>

        <div className="field">
          <label htmlFor="vaccinationWindowDays">
            {t('notifications.vaccinationWindow')}
          </label>
          <input
            id="vaccinationWindowDays"
            type="number"
            min="1"
            max="30"
            value={form.vaccinationWindowDays}
            disabled={!form.enabled}
            onChange={(e) => setForm({ ...form, vaccinationWindowDays: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <label htmlFor="appointmentWindowHours">
            {t('notifications.appointmentWindow')}
          </label>
          <input
            id="appointmentWindowHours"
            type="number"
            min="1"
            max="168"
            value={form.appointmentWindowHours}
            disabled={!form.enabled}
            onChange={(e) => setForm({ ...form, appointmentWindowHours: Number(e.target.value) })}
          />
        </div>

        {error && <p className="server-error">{error}</p>}
        {success && <p className="success-msg">{t('notifications.saved')}</p>}

        <button type="submit" disabled={saving}>{saving ? t('vaccinations.saving') : t('notifications.savePreferences')}</button>
      </form>

    </div>
  );
}
