import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { startCheckout } from '../services/billingApi';

const FEATURES = ['billing.feature1', 'billing.feature2', 'billing.feature3', 'billing.feature4'];

export default function UpgradePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/subscription/callback`;
      const { data } = await startCheckout(returnUrl);
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(t('billing.checkoutError'));
      setLoading(false);
    }
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
            {loading ? t('billing.redirecting') : t('billing.subscribeCta')}
          </button>
          <p className="upgrade-cta-note">{t('billing.ctaNote')}</p>
        </div>
      </div>
    </div>
  );
}
