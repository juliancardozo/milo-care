import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { getSubscriptionStatus } from '../services/billingApi';

export default function SubscriptionPage() {
  const { t } = useI18n();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSubscriptionStatus()
      .then(({ data }) => setSub(data))
      .catch(() => setError(t('billing.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="page-container">
        <p className="loading-text">{t('common.loading')}</p>
      </div>
    );
  }

  const isPremium = sub?.tier === 'premium';

  return (
    <div className="page-container">
      <Link to="/settings/account" className="back-link">{t('common.backToDashboard')}</Link>

      <div className="subscription-page">
        <h1 className="subscription-title">{t('billing.subscriptionTitle')}</h1>

        {error && <p className="form-error">{error}</p>}

        <div className="subscription-card">
          <div className="subscription-row">
            <span className="subscription-label">{t('billing.plan')}</span>
            <span className="subscription-value">
              {isPremium ? 'Milo Care Premium' : 'Milo Care Free'}
            </span>
          </div>
        </div>

        {!isPremium && (
          <Link to="/upgrade" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {t('billing.upgradeBtn')}
          </Link>
        )}

        {isPremium && (
          <p className="subscription-info-note">{t('billing.manageNote')}</p>
        )}
      </div>
    </div>
  );
}
