import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVetPanel } from '../../services/clinicApi';
import WeeklyBars from '../../components/WeeklyBars';
import ClinicQRCard from '../../components/ClinicQRCard';
import { useI18n } from '../../i18n/I18nProvider';
import '../../styles/vet-panel.css';

function fmtDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function monthLabel() {
  return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export default function VetPanelPage() {
  const { t } = useI18n();
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getVetPanel()
      .then(({ data }) => setPanel(data))
      .catch((err) => setError(err.response?.data?.message || t('vetPanel.error')))
      .finally(() => setLoading(false));
  }, [t]);

  async function copyLink() {
    if (!panel) return;
    try {
      await navigator.clipboard.writeText(panel.whatsappCopy || panel.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* noop */ }
  }

  function shareWhatsApp() {
    if (!panel) return;
    const text = encodeURIComponent(panel.whatsappCopy || panel.link);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  if (loading) return <div className="page vp-page"><div className="vp-skeleton" /></div>;
  if (error) return <div className="page vp-page"><p className="server-error">{error}</p></div>;
  if (!panel) return null;

  const s = panel.stats;

  return (
    <div className="vp-shell">
      <header className="vp-header">
        <div className="vp-header-left">
          <Link to="/dashboard" className="vp-back">← {t('appName')}</Link>
          <h1 className="vp-clinic">{panel.clinic.name}</h1>
          <p className="vp-period">{t('vetPanel.impact')} · {monthLabel()}</p>
        </div>
        <span className="vp-window">{t('vetPanel.last30')}</span>
      </header>

      <div className="vp-grid">
        {/* Columna principal: métricas */}
        <div className="vp-main">
          <div className="vp-hero">
            <span className="vp-hero-num">{s.alDia}</span>
            <p className="vp-hero-text">{t('vetPanel.heroUpToDate')}</p>
          </div>

          <div className="vp-stats">
            <div className="vp-stat">
              <span className="vp-stat-num">{s.referidosTotal}</span>
              <span className="vp-stat-label">{t('vetPanel.referred')}</span>
            </div>
            <div className="vp-stat">
              <span className="vp-stat-num">{s.activos}</span>
              <span className="vp-stat-label">{t('vetPanel.active')}</span>
            </div>
            <div className="vp-stat">
              <span className="vp-stat-num">{s.minutosAhorrados}</span>
              <span className="vp-stat-label">{t('vetPanel.minutesSaved')}</span>
            </div>
          </div>

          <section className="vp-section card vp-weekly">
            <h2 className="vp-section-title">{t('vetPanel.weeklyTitle')}</h2>
            <WeeklyBars data={panel.weekly} />
          </section>

          <section className="vp-section card vp-due">
            <h2 className="vp-section-title">{t('vetPanel.dueTitle')}</h2>
            {panel.dueSoon.length === 0 ? (
              <p className="vp-empty">{t('vetPanel.dueEmpty')}</p>
            ) : (
              <ul className="vp-due-list">
                {panel.dueSoon.map((d, i) => (
                  <li className="vp-due-item" key={i}>
                    <div className="vp-due-body">
                      <span className="vp-due-dog">{d.dogName}</span>
                      <span className="vp-due-meta">{d.ownerFirstName} · {d.what} ({d.name})</span>
                    </div>
                    <span className={`vp-due-badge ${d.overdue ? 'vp-due-overdue' : ''}`}>
                      {d.overdue ? t('vetPanel.overdue') : fmtDate(d.dueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Columna lateral: QR + compartir */}
        <aside className="vp-side">
          <section className="vp-section card vp-qr-card">
            <h2 className="vp-section-title">{t('qrCard.sectionTitle')}</h2>
            <ClinicQRCard clinic={panel.clinic} url={panel.link} compact />
          </section>

          <div className="vp-share card">
            <button type="button" className="vp-share-btn" onClick={copyLink}>
              {copied ? t('vetPanel.copied') : t('vetPanel.copyShare')}
            </button>
            <button type="button" className="vp-share-wa" onClick={shareWhatsApp}>WhatsApp</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
