import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { getSubscriptionStatus, cancelSubscription } from '../services/billingApi';
import '../styles/billing.css';

export default function SubscriptionPage() {
  const { t } = useI18n();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState(null);

  useEffect(() => {
    getSubscriptionStatus()
      .then(({ data }) => setSub(data))
      .catch(() => setError(t('billing.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCancel() {
    if (!window.confirm(t('billing.cancelConfirm'))) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelSubscription();
      setSub((prev) => ({ ...prev, canCancel: false, subscriptionStatus: 'cancelled' }));
      setCancelMsg(t('billing.cancelDone'));
    } catch {
      setError(t('billing.cancelError'));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p className="loading-text">{t('common.loading')}</p>
      </div>
    );
  }

  const isPremium = sub?.effectiveTier === 'premium' || sub?.tier === 'premium';
  const isCancelled = sub?.subscriptionStatus === 'cancelled';

  return (
    <div className="page-container">
      <Link to="/settings/account" className="back-link">{t('common.backToDashboard')}</Link>

      <div className="billing-shell">
        <div className="subscription-hero">
          <h1 className="subscription-title">{t('billing.subscriptionTitle')}</h1>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className={`subscription-plan-card${isPremium ? ' is-premium' : ''}`}>
          <div className="subscription-plan-top">
            <span className="subscription-plan-name">
              {isPremium ? '⭐ Milo Care Premium' : 'Milo Care Free'}
            </span>
            {isPremium ? (
              <span className={`subscription-pill ${isCancelled ? 'is-cancelled' : 'is-active'}`}>
                {isCancelled ? t('billing.statusCancelled') : t('billing.statusActive')}
              </span>
            ) : (
              <span className="subscription-pill is-free">{t('billing.statusFree')}</span>
            )}
          </div>
          <p className="subscription-plan-desc">
            {isPremium ? t('billing.premiumDesc') : t('billing.freeDesc')}
          </p>

          {!isPremium && (
            <div className="subscription-actions">
              <Link to="/upgrade" className="btn btn-primary">
                {t('billing.upgradeBtn')}
              </Link>
            </div>
          )}
        </div>

        {cancelMsg && (
          <p className="subscription-note is-success">
            <span aria-hidden="true">✓</span>
            <span>{cancelMsg}</span>
          </p>
        )}

        {isPremium && sub?.canCancel && !cancelMsg && (
          <button
            className="subscription-cancel-btn"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? t('billing.cancelling') : t('billing.cancelBtn')}
          </button>
        )}

        {isPremium && isCancelled && !cancelMsg && (
          <p className="subscription-note">
            <span aria-hidden="true">⏳</span>
            <span>{t('billing.cancelPending')}</span>
          </p>
        )}

        {isPremium && !sub?.canCancel && !isCancelled && (
          <p className="subscription-note">
            <span aria-hidden="true">💬</span>
            <span>{t('billing.manageNote')}</span>
          </p>
        )}
      </div>
    </div>
  );
}
