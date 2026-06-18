// Mini gráfico de barras (signups por semana) — sin dependencias externas.
export default function WeeklyBars({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="vp-bars" role="img" aria-label="Signups por semana">
      {data.map((d) => (
        <div className="vp-bar-col" key={d.label}>
          <span className="vp-bar-value">{d.count}</span>
          <div className="vp-bar-track">
            <div className="vp-bar-fill" style={{ height: `${Math.round((d.count / max) * 100)}%` }} />
          </div>
          <span className="vp-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
