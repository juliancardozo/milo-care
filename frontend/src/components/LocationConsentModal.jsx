import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useI18n } from '../i18n/I18nProvider';
import { updateLocation } from '../services/api';
import { updateUser } from '../store/authSlice';
import LocationPicker from './LocationPicker';
import '../styles/location.css';

const DISMISS_KEY = 'milocare.locationPromptDismissed';

export function dismissLocationPrompt() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
}

export function wasLocationPromptDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

export default function LocationConsentModal({ exampleKey = 'tick', onClose }) {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [value, setValue] = useState({ country: '', region: '', city: '' });
  const [saving, setSaving] = useState(false);

  const close = (dismiss = true) => {
    if (dismiss) dismissLocationPrompt();
    onClose();
  };

  const save = async () => {
    if (!value.country || saving) return;
    setSaving(true);
    try {
      const { data } = await updateLocation(value);
      dispatch(updateUser({ location: data.location, locationConsentAt: data.locationConsentAt }));
      dismissLocationPrompt();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="location-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="location-modal">
        <div className="location-emoji">{exampleKey === 'heat' ? '🌡️' : '🕷️'}</div>
        <h3 className="location-title">{t('location.consentTitle')}</h3>
        <p className="location-example">{t(`location.example.${exampleKey}`)}</p>

        <LocationPicker value={value} onChange={setValue} />

        <p className="location-privacy">{t('location.privacyNote')}</p>

        <div className="location-actions">
          <button className="location-ghost" onClick={() => close()}>{t('location.notNow')}</button>
          <button className="location-primary" disabled={!value.country || saving} onClick={save}>
            {saving ? t('location.saving') : t('location.activate')}
          </button>
        </div>
      </div>
    </div>
  );
}
