import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/preventive-care.css';

// Día del año (1–366): rota la sugerencia destacada para que se sienta fresca cada día.
function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

// Tarjeta de cuidado preventivo: sugerencias de actividades dentro y fuera de la app
// para sostener el hábito de cuidado de Milo. Rota a diario y permite ver otra idea.
export default function PreventiveCareCard({ dogId, dogName }) {
  const { t } = useI18n();
  const tips = t('dashboard.care.tips');
  const safeTips = Array.isArray(tips) ? tips : [];
  const [idx, setIdx] = useState(safeTips.length ? dayOfYear() % safeTips.length : 0);

  if (safeTips.length === 0) return null;

  const tip = safeTips[idx % safeTips.length];
  const fill = (s) => (typeof s === 'string' ? s.replaceAll('{dog}', dogName || '') : s);
  const to = tip.link && dogId ? `/dogs/${dogId}/${tip.link}` : null;

  return (
    <section className="pcare-card" aria-label={t('dashboard.care.title', { dog: dogName || '' })}>
      <div className="pcare-head">
        <div>
          <h2 className="pcare-title">{t('dashboard.care.title', { dog: dogName || '' })}</h2>
          <p className="pcare-subtitle">{t('dashboard.care.subtitle')}</p>
        </div>
        <button
          type="button"
          className="pcare-next"
          onClick={() => setIdx((i) => (i + 1) % safeTips.length)}
          aria-label={t('dashboard.care.next')}
        >
          🔄 {t('dashboard.care.next')}
        </button>
      </div>

      <div className={`pcare-tip ${tip.link ? 'pcare-tip-app' : 'pcare-tip-offline'}`}>
        <span className="pcare-tip-emoji" aria-hidden="true">{tip.emoji}</span>
        <div className="pcare-tip-body">
          <span className="pcare-tip-kind">
            {tip.link ? t('dashboard.care.inApp') : t('dashboard.care.activity')}
          </span>
          <h3 className="pcare-tip-title">{fill(tip.title)}</h3>
          <p className="pcare-tip-text">{fill(tip.text)}</p>
        </div>
        {to && (
          <Link to={to} className="pcare-tip-cta">{t('dashboard.care.do')}</Link>
        )}
      </div>
    </section>
  );
}
