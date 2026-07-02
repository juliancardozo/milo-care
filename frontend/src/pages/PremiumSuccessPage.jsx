import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/billing.css';

const UNLOCKS = ['billing.feature1', 'billing.feature2', 'billing.feature3', 'billing.feature4'];

// Destino tras un pago aprobado en Paddle (eventCallback checkout.completed). El alta de
// Premium la confirma el webhook del MoR; esta página solo da el feedback cálido al tutor.
export default function PremiumSuccessPage() {
  const { t } = useI18n();

  return (
    <div className="page-container">
      <div className="billing-shell premium-success">
        <div className="success-badge" aria-hidden="true">🎉</div>

        <h1 className="success-title">{t('checkout.successTitle')}</h1>
        <p className="success-subtitle">{t('checkout.successSubtitle')}</p>

        <div className="success-unlocks">
          <p className="success-unlocks-title">{t('checkout.successUnlocksTitle')}</p>
          {UNLOCKS.map((key) => (
            <div key={key} className="success-unlock">
              <span className="success-unlock-check">✓</span>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>

        <div className="success-actions">
          <Link to="/dashboard" className="btn btn-primary">
            {t('billing.goToDashboard')}
          </Link>
          <Link to="/subscription" className="btn btn-secondary">
            {t('checkout.successManage')}
          </Link>
        </div>

        <p className="success-receipt">{t('checkout.successReceipt')}</p>
      </div>
    </div>
  );
}
