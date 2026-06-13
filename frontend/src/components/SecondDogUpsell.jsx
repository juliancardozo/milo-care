import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { requestPremiumInterest } from '../services/billingApi';
import { FOUNDER_SLOTS_AVAILABLE } from '../config/founderPlan';
import '../styles/upsell.css';

// Upsell premium personalizado al intentar sumar un segundo perro (usuario free).
export default function SecondDogUpsell({ dogs = [] }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const names = dogs.map((d) => d.name).filter(Boolean);
  const firstName = names[0] || t('explore.yourDog');
  const namesLabel = names.length <= 1 ? firstName : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

  async function handleUpgrade() {
    setLoading(true);
    setError('');
    try {
      await requestPremiumInterest();
      setSent(true);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'ALREADY_PREMIUM') setSent(true);
      else setError(t('secondDog.error'));
    } finally {
      setLoading(false);
    }
  }

  const benefits = t('secondDog.benefits');
  const benefitList = Array.isArray(benefits) ? benefits : [];

  if (sent) {
    return (
      <div className="upsell-page">
        <div className="upsell-hero">
          <div className="upsell-sent">
            <div className="upsell-sent-emoji">🎉🐾</div>
            <h1>{t('secondDog.sentTitle')}</h1>
            <p>{t('secondDog.sentSub')}</p>
            <Link to="/dashboard" className="upsell-cta" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '14px 28px' }}>
              {t('secondDog.backToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upsell-page">
      <div className="upsell-hero">
        <p className="upsell-eyebrow">{t('secondDog.eyebrow')}</p>
        <h1 className="upsell-title">{t('secondDog.title', { dog: namesLabel })}</h1>

        <div className="upsell-pack">
          {dogs.slice(0, 3).map((d) => (
            d.photoUrl
              ? <img key={d.id} className="upsell-avatar" src={d.photoUrl} alt={d.name} />
              : <div key={d.id} className="upsell-avatar-ph">{(d.name || '?').charAt(0).toUpperCase()}</div>
          ))}
          <div className="upsell-plus" aria-hidden="true">＋</div>
        </div>
        <p className="upsell-pack-note">{t('secondDog.packNote')}</p>

        <p className="upsell-sub">{t('secondDog.sub', { dog: firstName })}</p>
      </div>

      <div className="upsell-benefits">
        <h3>{t('secondDog.benefitsTitle')}</h3>
        {benefitList.map((b, i) => (
          <div key={i} className="upsell-benefit"><span className="upsell-check">✓</span>{b}</div>
        ))}
      </div>

      {FOUNDER_SLOTS_AVAILABLE > 0 && (
        <div className="upsell-founder">🔥 {t('secondDog.founder', { n: FOUNDER_SLOTS_AVAILABLE })}</div>
      )}

      <button className="upsell-cta" onClick={handleUpgrade} disabled={loading}>
        {loading ? t('secondDog.ctaLoading') : t('secondDog.cta')}
      </button>
      <p className="upsell-reassure">{t('secondDog.reassure')}</p>
      {error && <p className="upsell-error">{error}</p>}
      <Link to="/dashboard" className="upsell-later">{t('secondDog.later')}</Link>
    </div>
  );
}
