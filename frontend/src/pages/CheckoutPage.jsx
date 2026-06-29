import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

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

  return (
    <div className="page-container">
      <div className="checkout-page" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        {(status === 'loading' || status === 'open') && (
          <p className="loading-text">{t(status === 'open' ? 'checkout.open' : 'checkout.loading')}</p>
        )}
        {status === 'notxn' && (
          <>
            <p>{t('checkout.notxn')}</p>
            <Link to="/upgrade" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t('billing.upgradeBtn')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="form-error">{t('checkout.error')}</p>
            <Link to="/upgrade" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t('billing.upgradeBtn')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
