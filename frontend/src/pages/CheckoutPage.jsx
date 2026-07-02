import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/billing.css';

// Página destino del "Default Payment Link" de Paddle. Cuando el backend crea una
// transacción, Paddle devuelve `…/checkout?_ptxn=txn_…`; acá inicializamos Paddle.js y
// abrimos el overlay de pago para esa transacción. Paddle es overlay (no página hosted),
// por eso el checkout vive sobre nuestro dominio con nuestra marca.
const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';

function loadPaddle() {
  return new Promise((resolve, reject) => {
    if (window.Paddle) return resolve(window.Paddle);
    const existing = document.querySelector(`script[src="${PADDLE_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = PADDLE_JS;
    s.async = true;
    s.onload = () => resolve(window.Paddle);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState('loading'); // loading | open | notxn | error

  useEffect(() => {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    const env = import.meta.env.VITE_PADDLE_ENV || 'production';
    const ptxn = new URLSearchParams(window.location.search).get('_ptxn');

    if (!token) { setStatus('error'); return undefined; }
    if (!ptxn) { setStatus('notxn'); return undefined; }

    let active = true;
    loadPaddle()
      .then((Paddle) => {
        if (!active || !Paddle) return;
        if (env === 'sandbox') Paddle.Environment.set('sandbox');
        Paddle.Initialize({
          token,
          eventCallback: (ev) => {
            if (ev?.name === 'checkout.completed') {
              window.location.href = '/premium/success';
            }
          },
        });
        Paddle.Checkout.open({ transactionId: ptxn });
        setStatus('open');
      })
      .catch(() => { if (active) setStatus('error'); });

    return () => { active = false; };
  }, []);

  const busy = status === 'loading' || status === 'open';

  return (
    <div className="page-container">
      <div className="billing-shell">
        <div className="checkout-card">
          <div className="checkout-head">
            <span className="checkout-brand">
              <span className="checkout-brand-dot" />
              {t('checkout.brandTag')}
            </span>
            <h1 className="checkout-plan-name">Milo Care Premium</h1>
            <p className="checkout-plan-period">{t('checkout.planPeriod')}</p>
          </div>

          <div className="checkout-body">
            {busy && (
              <>
                <div className="checkout-spinner" aria-hidden="true" />
                <p className="checkout-status-text">
                  {t(status === 'open' ? 'checkout.open' : 'checkout.loading')}
                </p>
                <p className="checkout-status-sub">{t('checkout.busySub')}</p>

                <div className="checkout-trust">
                  <span className="checkout-trust-item">
                    <span className="checkout-trust-icon">🔒</span>
                    {t('checkout.trustSecure')}
                  </span>
                  <span className="checkout-trust-item">
                    <span className="checkout-trust-icon">🛡️</span>
                    {t('checkout.trustMor')}
                  </span>
                  <span className="checkout-trust-item">
                    <span className="checkout-trust-icon">↺</span>
                    {t('checkout.trustCancel')}
                  </span>
                </div>

                <div className="checkout-consent">
                  <span className="checkout-consent-icon">ℹ️</span>
                  <span>{t('billing.recurringConsent')}</span>
                </div>
              </>
            )}

            {status === 'notxn' && (
              <>
                <div className="checkout-state-icon is-warn" aria-hidden="true">🔍</div>
                <p className="checkout-status-text">{t('checkout.notxn')}</p>
                <p className="checkout-status-sub">{t('checkout.notxnSub')}</p>
                <Link to="/upgrade" className="btn btn-primary checkout-cta">
                  {t('billing.upgradeBtn')}
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="checkout-state-icon is-error" aria-hidden="true">⚠️</div>
                <p className="checkout-status-text">{t('checkout.error')}</p>
                <p className="checkout-status-sub">{t('checkout.errorSub')}</p>
                <Link to="/upgrade" className="btn btn-primary checkout-cta">
                  {t('billing.upgradeBtn')}
                </Link>
                <Link to="/subscription" className="checkout-link-quiet">
                  {t('checkout.backToAccount')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
