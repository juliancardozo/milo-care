import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useI18n } from '../i18n/I18nProvider';
import BackLink from '../components/BackLink';
import { selectCurrentUser } from '../store/authSlice';
import { fetchFullRemindersList } from '../services/reminderFullListService';
import { updateReminderWindowPreference } from '../services/api';
import ReminderNotificationBanner from '../components/reminders/ReminderNotificationBanner';
import RemindersList from '../components/reminders/RemindersList';
import ReminderPreferences from '../components/reminders/ReminderPreferences';
import '../styles/reminders.css';

export default function RemindersPage() {
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);

  const [reminders, setReminders] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [dueToday, setDueToday] = useState([]);

  useEffect(() => {
    loadReminders();
    loadPreferences();
  }, [user?.id]);

  async function loadReminders() {
    try {
      setLoading(true);
      const reminders = await fetchFullRemindersList(7);
      setReminders(reminders || []);

      // Filter reminders due today
      const today = new Date().toDateString();
      const todayDue = reminders?.filter(
        (r) => new Date(r.dueAt).toDateString() === today
      ) || [];
      setDueToday(todayDue);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading reminders');
    } finally {
      setLoading(false);
    }
  }

  async function loadPreferences() {
    try {
      setPreferences({ reminderWindowDays: 7, emailReminders: true });
    } catch (err) {
      console.error('Error loading preferences:', err);
      setPreferences({ reminderWindowDays: 7, emailReminders: true });
    }
  }

  async function handleUpdatePreferences(newPrefs) {
    try {
      await updateReminderWindowPreference(newPrefs);
      setPreferences(newPrefs);
      setShowPreferences(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating preferences');
    }
  }

  return (
    <div className="reminders-page">
      <BackLink to="/dashboard" label={t('common.dashboard') || 'Dashboard'} />

      <header className="page-header">
        <h1>{t('reminders.title') || 'Reminders'}</h1>
        <button
          className="btn btn-secondary"
          onClick={() => setShowPreferences(!showPreferences)}
        >
          {showPreferences ? t('common.close') || 'Close' : t('reminders.preferences') || 'Preferences'}
        </button>
      </header>

      {/* Due Today Banner */}
      {dueToday.length > 0 && (
        <ReminderNotificationBanner
          items={dueToday}
          onDismiss={() => setDueToday([])}
        />
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Preferences Section */}
      {showPreferences && preferences && (
        <ReminderPreferences
          preferences={preferences}
          onSave={handleUpdatePreferences}
        />
      )}

      {/* Reminders List */}
      {loading ? (
        <div className="loading">{t('common.loading') || 'Loading...'}</div>
      ) : reminders.length === 0 ? (
        <div className="empty-state">
          <p>{t('reminders.noReminders') || 'No reminders set'}</p>
        </div>
      ) : (
        <RemindersList
          reminders={reminders}
          onRefresh={loadReminders}
        />
      )}
    </div>
  );
}
