import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVetPanel } from '../services/clinicApi';
import { useI18n } from '../i18n/I18nProvider';

// Primer-uso del veterinario en el dashboard (cuando aún no cargó ningún perro).
// A diferencia del tutor, su primer trabajo NO es crear un perro: es activar su
// clínica — compartir su link/QR para traer clientes y mirar su panel de impacto.
export default function VetWelcome() {
  const { t } = useI18n();
  const [panel, setPanel] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getVetPanel()
      .then(({ data }) => { if (active) { setPanel(data); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);

  async function copyLink() {
    if (!panel) return;
    try {
      await navigator.clipboard.writeText(panel.whatsappCopy || panel.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bloqueado: el link igual se ve en pantalla */ }
  }

  function shareWhatsApp() {
    if (!panel) return;
    const text = encodeURIComponent(panel.whatsappCopy || panel.link);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  const clinicName = panel?.clinic?.name;

  return (
    <div className="vw">
      <div className="vw-icon" aria-hidden="true">🏥</div>
      <h2 className="vw-title">{clinicName ? `${clinicName} ya está en Milo Care 🏥` : t('vetPanel.welcomeTitle')}</h2>
      <p className="vw-desc">{t('vetPanel.welcomeDesc')}</p>

      {/* Paso 1 — compartir el link (la acción de activación) */}
      <div className="vw-card">
        <div className="vw-card-head">
          <span className="vw-step" aria-hidden="true">1</span>
          <div>
            <h3>{t('vetPanel.actShareTitle')}</h3>
            <p>{t('vetPanel.actShareDesc')}</p>
          </div>
        </div>

        {status === 'ready' && panel?.link && (
          <>
            <div className="vw-link" title={panel.link}>{panel.link}</div>
            <div className="vw-share-actions">
              <button type="button" className="vw-share-btn" onClick={copyLink}>
                {copied ? t('vetPanel.copied') : t('vetPanel.copyShare')}
              </button>
              <button type="button" className="vw-share-wa" onClick={shareWhatsApp}>WhatsApp</button>
            </div>
          </>
        )}
        {status === 'loading' && <p className="vw-muted">{t('vetPanel.shareLoading')}</p>}
        {status === 'error' && <p className="vw-muted">{t('vetPanel.shareError')}</p>}
      </div>

      {/* Paso 2 — ir al panel (impacto, QR, certificar) */}
      <div className="vw-card">
        <div className="vw-card-head">
          <span className="vw-step" aria-hidden="true">2</span>
          <div>
            <h3>{t('vetPanel.actPanelTitle')}</h3>
            <p>{t('vetPanel.actPanelDesc')}</p>
          </div>
        </div>
        <Link to="/vet-portal" className="vw-panel-cta">{t('vetPanel.goToPanel')} →</Link>
      </div>

      {/* Camino de tutor, degradado: el vet que además tiene su propio perro */}
      <p className="vw-tutor-nudge">
        {t('vetPanel.tutorNudge')} <Link to="/dogs/new">{t('vetPanel.tutorNudgeCta')} →</Link>
      </p>
    </div>
  );
}
