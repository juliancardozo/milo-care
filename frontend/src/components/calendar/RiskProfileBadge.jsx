const LABELS = {
  low: 'Riesgo bajo',
  medium: 'Riesgo medio',
  high: 'Riesgo alto',
};

export default function RiskProfileBadge({ level }) {
  if (!level || !LABELS[level]) return null;
  return (
    <span className={`risk-badge risk-${level}`}>
      {LABELS[level]}
    </span>
  );
}
