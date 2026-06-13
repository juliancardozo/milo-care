import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useInstallPrompt } from '../utils/pwaInstall';
import '../styles/install.css';

const DISMISS_KEY = 'milocare.installDismissed';

export default function InstallPWA() {
  const { t } = useI18n();
  const { installable, installed, ios, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (installed || dismissed) return null;
  // En iOS no hay prompt nativo: mostramos instrucciones. En el resto, solo si es instalable.
  if (!installable && !ios) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div className="install-banner">
      <span className="install-icon" aria-hidden="true">🐾</span>
      <div className="install-text">
        <strong>{t('install.title')}</strong>
        <span>{ios ? t('install.iosHint') : t('install.subtitle')}</span>
      </div>
      {installable && (
        <button type="button" className="install-btn" onClick={promptInstall}>
          {t('install.button')}
        </button>
      )}
      <button type="button" className="install-dismiss" aria-label={t('install.dismiss')} onClick={dismiss}>✕</button>
    </div>
  );
}
