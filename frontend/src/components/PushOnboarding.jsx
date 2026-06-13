import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { enablePush, getPlatform, notificationPermission, isStandalone } from '../utils/push';
import { sendTestPush } from '../services/pushApi';
import '../styles/push-guide.css';

// Onboarding guiado y sin fricción para activar las notificaciones push.
// Sensible a la plataforma: cada SO/navegador las habilita distinto.
export default function PushOnboarding({ onClose, onDone }) {
  const { t } = useI18n();
  const platform = getPlatform();
  const standalone = isStandalone();
  const desktop = platform === 'macos' || platform === 'windows';

  const [perm, setPerm] = useState(notificationPermission());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [testResult, setTestResult] = useState(null); // null | number (delivered)
  const [step, setStep] = useState(0);

  // iOS sin instalar: primero hay que instalar la PWA.
  const iosNeedsInstall = platform === 'ios' && !standalone;

  // Pasos según plataforma.
  const steps = ['permission'];
  if (desktop) steps.push('system');
  steps.push('test');

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));

  async function grant() {
    setErr('');
    setBusy(true);
    try {
      await enablePush();
      setPerm('granted');
      if (onDone) onDone();
      next();
    } catch (e) {
      if (e.message === 'denied') setPerm('denied');
      else setErr(t('pushGuide.error'));
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    setErr('');
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await sendTestPush();
      setTestResult(data?.delivered ?? 0);
    } catch {
      setErr(t('pushGuide.error'));
    } finally {
      setBusy(false);
    }
  }

  const sysSteps = t(`pushGuide.system.${platform}`); // array de pasos

  return (
    <div className="pg-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pg-modal">
        <button className="pg-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="pg-head">
          <span className="pg-bell">🔔</span>
          <h2>{t('pushGuide.title')}</h2>
          <p>{t('pushGuide.subtitle')}</p>
        </div>

        {iosNeedsInstall ? (
          <div className="pg-step">
            <div className="pg-step-badge">📲</div>
            <h3>{t('pushGuide.ios.title')}</h3>
            <ol className="pg-list">
              {(t('pushGuide.ios.steps') || []).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <button className="pg-btn-ghost" onClick={onClose}>{t('pushGuide.gotIt')}</button>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="pg-stepper">
              {steps.map((_, i) => (
                <span key={i} className={`pg-seg ${i < step ? 'done' : i === step ? 'current' : ''}`} />
              ))}
            </div>

            {/* Paso: permiso del navegador */}
            {steps[step] === 'permission' && (
              <div className="pg-step">
                <div className="pg-step-badge">{perm === 'granted' ? '✅' : '1'}</div>
                <h3>{t('pushGuide.permission.title')}</h3>
                <p className="pg-step-text">{t('pushGuide.permission.text')}</p>

                {perm === 'denied' ? (
                  <div className="pg-warn">
                    <strong>{t('pushGuide.permission.blockedTitle')}</strong>
                    <p>{t('pushGuide.permission.blocked')}</p>
                  </div>
                ) : perm === 'granted' ? (
                  <button className="pg-btn" onClick={next}>{t('pushGuide.continue')}</button>
                ) : (
                  <button className="pg-btn" disabled={busy} onClick={grant}>
                    {busy ? t('pushGuide.activating') : t('pushGuide.allow')}
                  </button>
                )}
              </div>
            )}

            {/* Paso: permiso del sistema operativo (desktop) */}
            {steps[step] === 'system' && (
              <div className="pg-step">
                <div className="pg-step-badge">2</div>
                <h3>{t('pushGuide.system.title')}</h3>
                <p className="pg-step-text">{t('pushGuide.system.text')}</p>
                <ol className="pg-list">
                  {(Array.isArray(sysSteps) ? sysSteps : []).map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <button className="pg-btn" onClick={next}>{t('pushGuide.systemDone')}</button>
              </div>
            )}

            {/* Paso: probar */}
            {steps[step] === 'test' && (
              <div className="pg-step">
                <div className="pg-step-badge">{steps.length}</div>
                <h3>{t('pushGuide.test.title')}</h3>
                <p className="pg-step-text">{t('pushGuide.test.text')}</p>

                {testResult === null ? (
                  <button className="pg-btn" disabled={busy} onClick={runTest}>
                    {busy ? t('pushGuide.sending') : t('pushGuide.sendTest')}
                  </button>
                ) : testResult > 0 ? (
                  <>
                    <div className="pg-ok">{t('pushGuide.test.sent')}</div>
                    <div className="pg-actions">
                      <button className="pg-btn" onClick={() => { if (onDone) onDone(); onClose(); }}>{t('pushGuide.test.gotIt')}</button>
                      <button className="pg-btn-ghost" onClick={() => { setTestResult(null); setStep(desktop ? 1 : 0); }}>{t('pushGuide.test.notSeen')}</button>
                    </div>
                  </>
                ) : (
                  <div className="pg-warn">
                    <strong>{t('pushGuide.test.noDeviceTitle')}</strong>
                    <p>{t('pushGuide.test.noDevice')}</p>
                    <button className="pg-btn-ghost" onClick={() => setStep(0)}>{t('pushGuide.test.retry')}</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {err && <p className="pg-err">{err}</p>}
      </div>
    </div>
  );
}
