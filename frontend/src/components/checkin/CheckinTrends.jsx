import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { getCheckinTrends } from '../../services/checkinApi';

const CATEGORIES = ['comida', 'energia', 'agua', 'animo', 'digestion'];

function TrendRow({ category, counts, label }) {
  const total = counts.total || 0;
  const pct = (n) => (total > 0 ? `${(n / total) * 100}%` : '0%');
  return (
    <div className="checkin-trend-row">
      <span className="checkin-trend-label">{label}</span>
      <div className="checkin-trend-bar">
        <div className="checkin-trend-seg-bien" style={{ width: pct(counts.bien) }} />
        <div className="checkin-trend-seg-regular" style={{ width: pct(counts.regular) }} />
        <div className="checkin-trend-seg-mal" style={{ width: pct(counts.mal) }} />
      </div>
      <span className="checkin-trend-count">{total}</span>
    </div>
  );
}

export default function CheckinTrends({ dog }) {
  const { t } = useI18n();
  const [trends, setTrends] = useState(null);

  useEffect(() => {
    let active = true;
    getCheckinTrends(dog.id)
      .then(({ data }) => { if (active) setTrends(data.trends); })
      .catch(() => { if (active) setTrends(null); });
    return () => { active = false; };
  }, [dog.id]);

  if (!trends) return null;

  const w30 = trends.window30 || {};
  const hasData = CATEGORIES.some((c) => (w30[c]?.total || 0) > 0);
  const pattern = (trends.patterns || [])[0];

  return (
    <div className="checkin-trends">
      <h4 className="checkin-trends-title">{t('checkin.trendsTitle', { dog: dog.name })}</h4>
      <p className="checkin-trends-sub">{t('checkin.trends30')}</p>

      {!hasData ? (
        <p className="list-empty">{t('checkin.empty')}</p>
      ) : (
        CATEGORIES.map((c) => (
          <TrendRow
            key={c}
            category={c}
            counts={w30[c] || { bien: 0, regular: 0, mal: 0, total: 0 }}
            label={t(`checkin.catLabel.${c}`)}
          />
        ))
      )}

      {pattern && (
        <div className="checkin-pattern-banner">
          <p>
            {t('checkin.patternBanner', {
              dog: dog.name,
              n: pattern.run,
              phrase: t(`checkin.patternPhrase.${pattern.category}`),
            })}
          </p>
          <Link to={`/dogs/${dog.id}/appointments`}>{t('checkin.patternCta')}</Link>
        </div>
      )}
    </div>
  );
}
