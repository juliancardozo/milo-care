import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { updateReminderWindowPreference } from '../services/api';

const PRESETS = [7, 14, 30];

// Compact segmented control to pick how far ahead reminders are shown.
// Saving persists the preference and bubbles the new value up via onSaved.
export default function ReminderWindowPreference({ initialValue = 7, onSaved }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customOpen, setCustomOpen] = useState(!PRESETS.includes(initialValue));

  useEffect(() => {
    setValue(initialValue);
    setCustomOpen(!PRESETS.includes(initialValue));
  }, [initialValue]);

  async function save(days) {
    const next = Number(days);
    if (!next || next < 1 || next > 60) return;
    setValue(next);
    setSaving(true);
    setError('');
    try {
      const { data } = await updateReminderWindowPreference({ reminderWindowDays: next });
      onSaved?.(data.reminderWindowPreference);
    } catch (err) {
      setError(err.response?.data?.message || t('remindersFullList.errors.savePreference'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rfl-window">
      <span className="rfl-window-label">{t('remindersFullList.window.label')}</span>
      <div className="rfl-segmented" role="group" aria-label={t('remindersFullList.window.label')}>
        {PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            className={`rfl-seg ${!customOpen && value === d ? 'rfl-seg-on' : ''}`}
            onClick={() => { setCustomOpen(false); save(d); }}
            disabled={saving}
          >
            {t(`remindersFullList.window.days${d}`)}
          </button>
        ))}
        <button
          type="button"
          className={`rfl-seg ${customOpen ? 'rfl-seg-on' : ''}`}
          onClick={() => setCustomOpen(true)}
          disabled={saving}
        >
          {t('remindersFullList.window.custom')}
        </button>
      </div>

      {customOpen && (
        <div className="rfl-window-custom">
          <input
            type="number"
            min="1"
            max="60"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={t('remindersFullList.preferenceLabel')}
          />
          <button type="button" className="rfl-window-apply" onClick={() => save(value)} disabled={saving}>
            {saving ? t('remindersFullList.window.saving') : t('remindersFullList.savePreference')}
          </button>
        </div>
      )}

      {error && <p className="server-error">{error}</p>}
    </div>
  );
}
