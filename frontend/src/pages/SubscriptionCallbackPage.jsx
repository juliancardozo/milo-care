import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from '../store/authSlice';
import { useI18n } from '../i18n/I18nProvider';
import { syncSubscription } from '../services/billingApi';

export default function SubscriptionCallbackPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [status, setStatus] = useState('loading'); // loading | success | pending | error

  useEffect(() => {
    syncSubscription()
      .then(({ data }) => {
        if (data.tier === 'premium' && data.status === 'active') {
          dispatch(updateUser({ tier: 'premium', billingSubscriptionStatus: 'active' }));
          setStatus('success');
        } else if (data.status === 'pending') {
          setStatus('pending');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className="page-container callback-page">
        <div className="callback-icon callback-icon--loading">⏳</div>
        <p>{t('billing.callbackVerifying')}</p>
      </div>
    );
  }

  return (
    <div className="page-container callback-page">
      {status === 'success' && (
        <>
          <div className="callback-icon callback-icon--success">🎉</div>
          <h1 className="callback-title">{t('billing.callbackSuccessTitle')}</h1>
          <p className="callback-subtitle">{t('billing.callbackSuccessSubtitle')}</p>
          <Link to="/dashboard" className="btn btn-primary">{t('billing.goToDashboard')}</Link>
        </>
      )}

      {status === 'pending' && (
        <>
          <div className="callback-icon callback-icon--pending">⏳</div>
          <h1 className="callback-title">{t('billing.callbackPendingTitle')}</h1>
          <p className="callback-subtitle">{t('billing.callbackPendingSubtitle')}</p>
          <Link to="/dashboard" className="btn btn-primary">{t('billing.goToDashboard')}</Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="callback-icon callback-icon--error">✗</div>
          <h1 className="callback-title">{t('billing.callbackErrorTitle')}</h1>
          <p className="callback-subtitle">{t('billing.callbackErrorSubtitle')}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/upgrade" className="btn btn-primary">{t('billing.tryAgain')}</Link>
            <Link to="/dashboard" className="btn btn-ghost">{t('billing.goToDashboard')}</Link>
          </div>
        </>
      )}
    </div>
  );
}
