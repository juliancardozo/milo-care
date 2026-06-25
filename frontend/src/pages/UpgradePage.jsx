import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { requestPremiumInterest } from '../services/billingApi';
import { startPremiumCheckout } from '../services/companionApi';

const FEATURES = ['billing.feature1', 'billing.feature2', 'billing.feature3', 'billing.feature4'];

export default function UpgradePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      // Primero intentamos el checkout de Mercado Pago; si no está configurado
      // (503) caemos al flujo de interés manual existente.
      try {
        const { data } = await startPremiumCheckout();
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      } catch (mpErr) {
        if (mpErr.response?.status !== 503) throw mpErr;
      }
      await requestPremiumInterest();
      setSent(true);
    } catch {
      setError(t('billing.interestError'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="page-container">
        <Link to="/dashboard" className="back-link">{t('common.backToDashboard')}</Link>
        <div className="upgrade-page">
          <div className="upgrade-hero">
            <span className="upgrade-hero-icon">🎉</span>
            <h1 className="upgrade-hero-title">{t('billing.interestSentTitle')}</h1>
            <p className="upgrade-hero-subtitle">{t('billing.interestSentSubtitle')}</p>
          </div>
          <div className="upgrade-cta">
            <Link to="/dashboard" className="btn btn-primary upgrade-cta-btn">
              {t('billing.goToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Link to="/dashboard" className="back-link">{t('common.backToDashboard')}</Link>

      <div className="upgrade-page">
        <div className="upgrade-hero">
          <span className="upgrade-hero-icon">⭐</span>
          <h1 className="upgrade-hero-title">{t('billing.upgradeTitle')}</h1>
          <p className="upgrade-hero-subtitle">{t('billing.upgradeSubtitle')}</p>
        </div>

        <div className="upgrade-features">
          {FEATURES.map((key) => (
            <div key={key} className="upgrade-feature-item">
              <span className="upgrade-feature-check">✓</span>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>

        <div className="upgrade-cta">
          {error && <p className="form-error">{error}</p>}
          <button
            className="btn btn-primary upgrade-cta-btn"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? t('billing.sending') : t('billing.interestCta')}
          </button>
          <p className="upgrade-cta-note">{t('billing.ctaNote')}</p>
        </div>
      </div>
    </div>
  );
}
