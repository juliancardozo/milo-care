import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { updateReminderWindowPreference } from '../services/api';

export default function ReminderWindowPreference({ initialValue = 7, onSaved }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = { reminderWindowDays: Number(value) };
      const { data } = await updateReminderWindowPreference(payload);
      onSaved?.(data.reminderWindowPreference);
    } catch (err) {
      setError(err.response?.data?.message || t('remindersFullList.errors.savePreference'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="reminderWindowPref">{t('remindersFullList.preferenceLabel')}</label>
        <input
          id="reminderWindowPref"
          type="number"
          min="1"
          max="60"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
      {error && <p className="server-error">{error}</p>}
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? t('common.loading') : t('remindersFullList.savePreference')}
      </button>
    </div>
  );
}
