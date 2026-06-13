import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

const STICKER_EMOJI = {
  'hueso-dorado': '🦴',
  'corazon-patita': '💗',
  'medalla-buen-perro': '🏅',
  'estrella-milo': '⭐',
};

export default function SurpriseModal({ surprise, onClose }) {
  const { t } = useI18n();
  if (!surprise) return null;

  let emoji = '🦴';
  let body = null;
  let extra = null;

  if (surprise.type === 'breed_fact') {
    body = surprise.fact;
  } else if (surprise.type === 'sticker') {
    emoji = STICKER_EMOJI[surprise.stickerId] || '🎁';
    body = t('surprise.stickerBody');
  } else if (surprise.type === 'boosted_referral') {
    emoji = '🚀';
    body = t('surprise.boostBody', { days: surprise.rewardDays, hours: surprise.validHours });
    extra = <Link to="/settings/account" className="surprise-close" style={{ textDecoration: 'none', marginTop: 10, display: 'inline-block' }} onClick={onClose}>{t('surprise.boostCta')}</Link>;
  }

  return (
    <div className="surprise-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="surprise-modal">
        <div className={surprise.type === 'sticker' ? 'surprise-sticker' : 'surprise-emoji'}>{emoji}</div>
        <h3 className="surprise-title">{t('surprise.title')}</h3>
        <p className="surprise-body">{body}</p>
        {extra}
        <div>
          <button className="surprise-close" onClick={onClose}>{t('surprise.close')}</button>
        </div>
      </div>
    </div>
  );
}
