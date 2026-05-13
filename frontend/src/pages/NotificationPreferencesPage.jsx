import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectCurrentUser, updateUser } from '../store/authSlice';
import { updateNotificationPreferences } from '../services/api';

export default function NotificationPreferencesPage() {
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
      setError(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1>Notification Preferences</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enable email notifications
          </label>
        </div>

        <div className="field">
          <label htmlFor="vaccinationWindowDays">
            Vaccination reminder (days before due date)
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
            Appointment reminder (hours before appointment)
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
        {success && <p className="success-msg">Preferences saved.</p>}

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
      </form>

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}
