import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import BackLink from '../components/BackLink';
import { selectCurrentUser, updateUser } from '../store/authSlice';
import { updateNotificationPreferences, updateLocation, deleteLocation } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import { isPushSupported, isIosNotInstalled, getPushSubscribed, disablePush } from '../utils/push';
import { sendTestPush } from '../services/pushApi';
import PushOnboarding from '../components/PushOnboarding';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/location.css';
import '../styles/notifications.css';

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="notif-switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="notif-slider" />
    </label>
  );
}

function daypartEmoji(h) {
  if (h < 6) return '🌙';
  if (h < 12) return '🌅';
  if (h < 19) return '☀️';
  if (h < 22) return '🌆';
  return '🌙';
}

function HourSelect({ value, onChange, disabled }) {
  return (
    <select
      className="notif-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00 ${daypartEmoji(h)}`}</option>
      ))}
    </select>
  );
}

export default function NotificationPreferencesPage() {
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const prefs = user?.notificationPreferences || { enabled: true, vaccinationWindowDays: 7, appointmentWindowHours: 24 };

  const [form, setForm] = useState({
    enabled: prefs.enabled,
    vaccinationWindowDays: prefs.vaccinationWindowDays,
    appointmentWindowHours: prefs.appointmentWindowHours,
    checkinEnabled: prefs.checkinEnabled !== false,
    checkinHour: prefs.checkinHour != null ? prefs.checkinHour : 19,
    channel: prefs.channel || 'email',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Estado de la suscripción push de este navegador.
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushInfo, setPushInfo] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    if (supported) getPushSubscribed().then(setPushSubscribed);
  }, [supported]);

  async function togglePush(on) {
    setPushError('');
    setPushInfo('');
    if (on) {
      // Abrimos el onboarding guiado (permiso + sistema + prueba), sin fricción.
      setShowGuide(true);
      return;
    }
    setPushBusy(true);
    try {
      await disablePush();
      setPushSubscribed(false);
    } catch {
      setPushError(t('notifications.pushError'));
    } finally {
      setPushBusy(false);
    }
  }

  function onGuideDone() {
    setPushSubscribed(true);
    if (form.channel === 'email') set({ channel: 'both' });
  }

  const set = (patch) => { setForm({ ...form, ...patch }); setSuccess(false); };

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
    <div className="notif-page">
      <BackLink to="/dashboard" />

      <div className="notif-hero">
        <div className="notif-hero-emoji">🐾</div>
        <h1>{t('notifications.heroTitle')}</h1>
        <p>{t('notifications.heroSubtitle')}</p>
        <div className="notif-onceaday">✓ {t('notifications.onePerDay')}</div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Check-in diario (protagonista) ───────────────────────────── */}
        <section className="notif-card">
          <div className="notif-card-head">
            <span className="notif-card-icon notif-icon-checkin">💛</span>
            <div>
              <h2>{t('notifications.checkinSection')}</h2>
              <p>{t('notifications.enableCheckinDesc')}</p>
            </div>
          </div>

          <div className="notif-row">
            <span className="notif-row-label">{t('notifications.enableCheckin')}</span>
            <Switch checked={form.checkinEnabled} onChange={(v) => set({ checkinEnabled: v })} />
          </div>

          <div className={`notif-row ${form.checkinEnabled ? '' : 'notif-disabled'}`}>
            <span>
              <span className="notif-row-label">{t('notifications.checkinHour')}</span>
              <div className="notif-row-hint">{t('notifications.checkinHourHint')}</div>
            </span>
            <HourSelect value={form.checkinHour} disabled={!form.checkinEnabled} onChange={(v) => set({ checkinHour: v })} />
          </div>

          <div className={`notif-row ${form.checkinEnabled ? '' : 'notif-disabled'}`}>
            <span className="notif-row-label">{t('notifications.channelTitle')}</span>
            <div className="notif-channel">
              {['email', 'push', 'both'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`notif-channel-btn ${form.channel === c ? 'active' : ''}`}
                  disabled={!form.checkinEnabled}
                  onClick={() => set({ channel: c })}
                >
                  {t(`notifications.channel${c === 'email' ? 'Email' : c === 'push' ? 'Push' : 'Both'}`)}
                </button>
              ))}
            </div>
          </div>

          <div className={`notif-preview ${form.checkinEnabled ? '' : 'notif-disabled'}`}>
            <p className="notif-preview-label">{t('notifications.previewLabel')}</p>
            <div className="notif-preview-card">
              <div className="notif-preview-brand">🐾 Milo Care</div>
              <p className="notif-preview-q">{t('notifications.previewQuestion')}</p>
              <div className="notif-preview-answers">
                <span className="notif-pa-bien">{t('checkin.answers.bien')}</span>
                <span className="notif-pa-reg">{t('checkin.answers.regular')}</span>
                <span className="notif-pa-mal">{t('checkin.answers.mal')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Notificaciones push ──────────────────────────────────────── */}
        <section className="notif-card">
          <div className="notif-card-head">
            <span className="notif-card-icon notif-icon-checkin">📲</span>
            <div>
              <h2>{t('notifications.pushTitle')}</h2>
              <p>{t('notifications.pushDesc')}</p>
            </div>
          </div>

          {!supported ? (
            <p className="notif-row-hint">{t('notifications.pushUnsupported')}</p>
          ) : (
            <>
              <div className="notif-row">
                <span className="notif-row-label">
                  {pushSubscribed ? t('notifications.pushOn') : t('notifications.pushEnable')}
                </span>
                <Switch checked={pushSubscribed} disabled={pushBusy} onChange={togglePush} />
              </div>
              {pushSubscribed && (
                <div className="notif-row">
                  <span className="notif-row-hint">{t('notifications.pushTestHint')}</span>
                  <button type="button" className="notif-channel-btn" onClick={async () => {
                    setPushError(''); setPushInfo('');
                    try {
                      const { data } = await sendTestPush();
                      setPushInfo(data?.delivered > 0 ? t('notifications.pushTestSent') : t('notifications.pushTestNone'));
                    } catch { setPushError(t('notifications.pushError')); }
                  }}>{t('notifications.pushTest')}</button>
                </div>
              )}
              {pushInfo && <p className="notif-row-hint" style={{ color: '#16a34a' }}>{pushInfo}</p>}
              {isIosNotInstalled() && <p className="notif-row-hint">{t('notifications.pushIosHint')}</p>}
              {pushError && <p className="notif-error">{pushError}</p>}
              <button type="button" className="notif-guide-link" onClick={() => setShowGuide(true)}>
                {t('notifications.pushGuideLink')}
              </button>
            </>
          )}
        </section>

        {/* ── Recordatorios de salud ───────────────────────────────────── */}
        <section className="notif-card">
          <div className="notif-card-head">
            <span className="notif-card-icon notif-icon-health">🩺</span>
            <div>
              <h2>{t('notifications.healthTitle')}</h2>
              <p>{t('notifications.healthDesc')}</p>
            </div>
          </div>

          <div className="notif-row">
            <span className="notif-row-label">{t('notifications.enableEmail')}</span>
            <Switch checked={form.enabled} onChange={(v) => set({ enabled: v })} />
          </div>

          <div className={`notif-row ${form.enabled ? '' : 'notif-disabled'}`}>
            <span className="notif-row-label">{t('notifications.vaccinationWindow')}</span>
            <span>
              <input
                className="notif-number" type="number" min="1" max="30"
                value={form.vaccinationWindowDays} disabled={!form.enabled}
                onChange={(e) => set({ vaccinationWindowDays: Number(e.target.value) })}
              />
              <span className="notif-unit">{t('notifications.unitDays')}</span>
            </span>
          </div>

          <div className={`notif-row ${form.enabled ? '' : 'notif-disabled'}`}>
            <span className="notif-row-label">{t('notifications.appointmentWindow')}</span>
            <span>
              <input
                className="notif-number" type="number" min="1" max="168"
                value={form.appointmentWindowHours} disabled={!form.enabled}
                onChange={(e) => set({ appointmentWindowHours: Number(e.target.value) })}
              />
              <span className="notif-unit">{t('notifications.unitHours')}</span>
            </span>
          </div>
        </section>

        <div className="notif-savebar">
          <button type="submit" className="notif-save" disabled={saving}>
            {saving ? t('vaccinations.saving') : t('notifications.savePreferences')}
          </button>
          {success && <span className="notif-saved">{t('notifications.savedWarm')}</span>}
          {error && <span className="notif-error">{error}</span>}
        </div>
      </form>

      {/* ── Tu zona ─────────────────────────────────────────────────────── */}
      <ZoneCard />

      {showGuide && (
        <PushOnboarding onClose={() => setShowGuide(false)} onDone={onGuideDone} />
      )}
    </div>
  );
}

function ZoneCard() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const current = user?.location || null;

  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(current || { country: '', region: '', city: '' });
  const [busy, setBusy] = useState(false);

  const zoneLabel = current ? [current.city, current.region].filter(Boolean).join(', ') || (current.country === 'UY' ? 'Uruguay' : 'Argentina') : '';

  async function save() {
    if (!value.country || busy) return;
    setBusy(true);
    try {
      const { data } = await updateLocation(value);
      dispatch(updateUser({ location: data.location, locationConsentAt: data.locationConsentAt }));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteLocation();
      dispatch(updateUser({ location: null, locationConsentAt: null }));
      setValue({ country: '', region: '', city: '' });
      setEditing(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="notif-card">
      <div className="notif-card-head">
        <span className="notif-card-icon notif-icon-zone">📍</span>
        <div>
          <h2>{t('location.sectionTitle')}</h2>
          <p>{t('location.sectionDesc')}</p>
        </div>
      </div>

      {current && !editing ? (
        <div className="notif-zone-current">
          <strong>📍 {zoneLabel}</strong>
          <span>
            <button type="button" className="notif-zone-link" onClick={() => setEditing(true)}>{t('location.edit')}</button>
            <button type="button" className="notif-zone-del" onClick={remove} disabled={busy}>{t('location.delete')}</button>
          </span>
        </div>
      ) : (
        <>
          <LocationPicker value={value} onChange={setValue} />
          <p className="location-privacy">{t('location.privacyNote')}</p>
          <div className="notif-savebar">
            <button type="button" className="notif-save" onClick={save} disabled={!value.country || busy}>
              {busy ? t('location.saving') : t('location.save')}
            </button>
            {current && (
              <button type="button" className="notif-zone-link" onClick={() => { setEditing(false); setValue(current); }}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
