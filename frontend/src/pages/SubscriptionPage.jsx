import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from '../store/authSlice';
import { useI18n } from '../i18n/I18nProvider';
import { getSubscriptionStatus, cancelSubscription } from '../services/billingApi';

const STATUS_LABEL = {
  none:           'billing.statusNone',
  pending:        'billing.statusPending',
  active:         'billing.statusActive',
  past_due:       'billing.statusPastDue',
  cancel_pending: 'billing.statusCancelPending',
  canceled:       'billing.statusCanceled',
  failed:         'billing.statusFailed',
};

export default function SubscriptionPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSubscriptionStatus()
      .then(({ data }) => setSub(data))
      .catch(() => setError(t('billing.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCancel() {
    setCanceling(true);
    setError(null);
    try {
      await cancelSubscription();
      dispatch(updateUser({ tier: 'free', billingSubscriptionStatus: 'cancel_pending' }));
      setSub((prev) => ({ ...prev, status: 'cancel_pending' }));
      setConfirmCancel(false);
    } catch {
      setError(t('billing.cancelError'));
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p className="loading-text">{t('common.loading')}</p>
      </div>
    );
  }

  const isActive = sub?.status === 'active' || sub?.status === 'past_due';
  const canCancel = isActive && sub?.status !== 'cancel_pending';
  const periodEnd = sub?.periodEnd ? new Date(sub.periodEnd).toLocaleDateString() : null;

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
              {sub?.tier === 'premium' ? 'Milo Care Premium' : 'Milo Care Free'}
            </span>
          </div>

          <div className="subscription-row">
            <span className="subscription-label">{t('billing.status')}</span>
            <span className={`subscription-badge subscription-badge--${sub?.status || 'none'}`}>
              {t(STATUS_LABEL[sub?.status] || 'billing.statusNone')}
            </span>
          </div>

          {periodEnd && (
            <div className="subscription-row">
              <span className="subscription-label">{t('billing.nextBilling')}</span>
              <span className="subscription-value">{periodEnd}</span>
            </div>
          )}
        </div>

        {sub?.tier === 'free' && sub?.status === 'none' && (
          <Link to="/upgrade" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {t('billing.upgradeBtn')}
          </Link>
        )}

        {canCancel && !confirmCancel && (
          <button
            className="btn btn-ghost subscription-cancel-btn"
            onClick={() => setConfirmCancel(true)}
          >
            {t('billing.cancelSubscription')}
          </button>
        )}

        {confirmCancel && (
          <div className="subscription-confirm-cancel">
            <p>{t('billing.cancelConfirm')}</p>
            <div className="subscription-confirm-actions">
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={canceling}
              >
                {canceling ? t('billing.canceling') : t('billing.confirmYes')}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmCancel(false)}
                disabled={canceling}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {sub?.status === 'cancel_pending' && (
          <p className="subscription-info-note">{t('billing.cancelPendingNote')}</p>
        )}
      </div>
    </div>
  );
}
