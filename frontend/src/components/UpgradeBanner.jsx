import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

export default function UpgradeBanner() {
  const { t } = useI18n();

  return (
    <div className="upgrade-banner">
      <div className="upgrade-banner-content">
        <span className="upgrade-banner-icon">⭐</span>
        <div>
          <p className="upgrade-banner-title">{t('billing.bannerTitle')}</p>
          <p className="upgrade-banner-subtitle">{t('billing.bannerSubtitle')}</p>
        </div>
      </div>
      <Link to="/upgrade" className="btn upgrade-banner-btn">
        {t('billing.upgradeBtn')}
      </Link>
    </div>
  );
}
