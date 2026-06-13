import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { getMyReferrals, markReferralShared } from '../services/referralApi';
import '../styles/referrals.css';

export default function ReferralCard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMyReferrals().then((res) => setData(res.data)).catch(() => setData(null));
  }, []);

  if (!data) return null;

  const link = `${window.location.origin}/register?ref=${data.code}`;
  const waMessage = t('referrals.waMessage', { link });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      markReferralShared('copy').catch(() => {});
    } catch {
      // noop
    }
  };

  const shareWhatsApp = () => {
    markReferralShared('whatsapp').catch(() => {});
    window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, '_blank', 'noopener');
  };

  return (
    <div className="card referral-card">
      <h2>{t('referrals.title')}</h2>
      <p className="referral-sub">{t('referrals.subtitle')}</p>

      <div className="referral-code-box">
        <span className="referral-code">{data.code}</span>
        <button className="referral-copy" onClick={copyLink}>
          {copied ? t('referrals.copied') : t('referrals.copyLink')}
        </button>
      </div>

      <button className="btn referral-wa" onClick={shareWhatsApp}>{t('referrals.shareWhatsApp')}</button>

      <div className="referral-stats">
        <span>{t('referrals.invited', { n: data.total })}</span>
        <span>{t('referrals.activated', { n: data.activated })}</span>
      </div>

      {data.referrals.length > 0 && (
        <ul className="referral-list">
          {data.referrals.map((r) => (
            <li key={r.id} className={`referral-item ${r.status}`}>
              <span className="referral-item-email">{r.referredEmail || '—'}</span>
              <span className={`referral-badge referral-badge-${r.status}`}>
                {r.status === 'activated' ? t('referrals.statusActivated') : t('referrals.statusPending')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
