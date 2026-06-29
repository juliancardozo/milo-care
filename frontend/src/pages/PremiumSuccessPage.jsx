import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

// Destino tras un pago aprobado en Paddle (eventCallback checkout.completed). El alta de
// Premium la confirma el webhook del MoR; esta página solo da el feedback cálido al tutor.
export default function PremiumSuccessPage() {
  const { t } = useI18n();

  return (
    <div className="page-container">
      <div className="upgrade-page">
        <div className="upgrade-hero">
          <span className="upgrade-hero-icon">🎉</span>
          <h1 className="upgrade-hero-title">{t('checkout.successTitle')}</h1>
          <p className="upgrade-hero-subtitle">{t('checkout.successSubtitle')}</p>
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
