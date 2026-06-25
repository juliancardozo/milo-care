import { useEffect, useState } from 'react';
import { getHealthScore } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/health-score.css';

const R = 54;
const CIRC = 2 * Math.PI * R;

// Anillo de progreso del Health Score (0–100).
function ScoreRing({ score, color }) {
  const offset = CIRC * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <svg className="hs-ring" viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
      <circle className="hs-ring-bg" cx="64" cy="64" r={R} />
      <circle
        className="hs-ring-fg"
        cx="64" cy="64" r={R}
        stroke={color}
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
      />
      <text x="64" y="60" className="hs-ring-num">{score}</text>
      <text x="64" y="82" className="hs-ring-max">/ 100</text>
    </svg>
  );
}

const DOT = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444' };

export default function HealthScoreCard({ dogId, dogName, variant = 'card' }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const inline = variant === 'inline';

  useEffect(() => {
    if (!dogId) return;
    let ignore = false;
    setData(null);
    setFailed(false);
    getHealthScore(dogId)
      .then(({ data }) => { if (!ignore) setData(data); })
      .catch(() => { if (!ignore) setFailed(true); });
    return () => { ignore = true; };
  }, [dogId]);

  if (failed) return null;

  if (!data) {
    return (
      <section className={`hs-card hs-card-loading ${inline ? 'hs-inline' : ''}`} aria-busy="true">
        <div className="hs-ring-skeleton" />
        <div className="hs-skeleton-lines">
          <span /><span />
        </div>
      </section>
    );
  }

  const { score, grade, factors, verification } = data;
  const seal = verification && verification.level && verification.level !== 'self' ? verification : null;
  const sealText = seal
    ? (seal.level === 'certified' && seal.certifiedBy
        ? t('healthScore.sealCertifiedBy', { clinic: seal.certifiedBy })
        : t('healthScore.sealVerified'))
    : null;
  // Mejor próxima acción: el factor con más puntos por ganar (no perfecto).
  const nextStep = [...factors]
    .filter((f) => f.points < f.max)
    .sort((a, b) => (b.max - b.points) - (a.max - a.points))[0];

  return (
    <section className={`hs-card ${inline ? 'hs-inline' : ''}`} style={{ '--hs-color': grade.color }}>
      <div className="hs-top">
        <ScoreRing score={score} color={grade.color} />
        <div className="hs-summary">
          <span className="hs-eyebrow">{dogName ? t('healthScore.titleWithDog', { dog: dogName }) : t('healthScore.title')}</span>
          <strong className="hs-grade" style={{ color: grade.color }}>{grade.label}</strong>
          {seal && (
            <span className={`hs-seal hs-seal-${seal.level}`} title={seal.validUntil ? t('healthScore.sealValidUntil', { date: new Date(seal.validUntil).toLocaleDateString() }) : undefined}>
              <span aria-hidden="true">✓</span> {sealText}
            </span>
          )}
          {nextStep ? (
            <p className="hs-next">
              <span className="hs-next-label">{t('healthScore.boost')}:</span> {nextStep.hint}
            </p>
          ) : (
            <p className="hs-next hs-next-perfect">{t('healthScore.perfect', { dog: dogName || '' })}</p>
          )}
          <button className="hs-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? t('healthScore.hideBreakdown') : t('healthScore.breakdown')}
            <span className="hs-caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {open && (
        <ul className="hs-factors">
          {factors.map((f) => (
            <li key={f.key} className="hs-factor">
              <span className="hs-factor-dot" style={{ background: DOT[f.status] }} aria-hidden="true" />
              <span className="hs-factor-body">
                <span className="hs-factor-head">
                  <span className="hs-factor-label">{f.label}</span>
                  <span className="hs-factor-pts">{f.points}/{f.max}</span>
                </span>
                <span className="hs-factor-bar">
                  <span className="hs-factor-fill" style={{ width: `${(f.points / f.max) * 100}%`, background: DOT[f.status] }} />
                </span>
                <span className="hs-factor-hint">{f.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
