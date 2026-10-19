import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPartnerCompliance } from '../../services/partnerAdminApi';
import '../../styles/partner-dashboard.css';

// Semáforo de cumplimiento antirrábica. El color/label los define el backend
// (barrioCompliance.STATUS); acá solo mapeamos a estilos.
const STATUS_STYLE = {
  green: { cls: 'ok', dot: '🟢' },
  amber: { cls: 'soon', dot: '🟡' },
  red: { cls: 'over', dot: '🔴' },
  grey: { cls: 'none', dot: '⚪' },
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Anillo de progreso 0–100% (reutiliza el patrón del panel de partner).
function ComplianceRing({ value }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const v = Math.max(0, Math.min(1, value || 0));
  const color = v >= 0.9 ? '#16a34a' : v >= 0.7 ? '#d97706' : '#dc2626';
  return (
    <svg viewBox="0 0 108 108" width="108" height="108" className="bcomp-ring" role="img" aria-label={`${Math.round(v * 100)}% al día`}>
      <circle cx="54" cy="54" r={R} className="pdash-ring-bg" strokeWidth="9" fill="none" />
      <circle cx="54" cy="54" r={R} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - v)} transform="rotate(-90 54 54)" />
      <text x="54" y="60" textAnchor="middle" className="bcomp-ring-num">{Math.round(v * 100)}%</text>
    </svg>
  );
}

export default function BarrioCompliancePanel({ partnerId, user }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }
    let ignore = false;
    setLoading(true);
    setError('');
    getPartnerCompliance(partnerId)
      .then((r) => { if (!ignore) setReport(r.data); })
      .catch((err) => { if (!ignore) setError(err.response?.data?.message || 'No pudimos cargar el panel de cumplimiento.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [partnerId]);

  const brand = report?.partner?.branding?.primaryColor || '#166b4e';
  const appName = report?.partner?.branding?.appName || report?.partner?.name || 'Barrio';
  const t = report?.totals;

  const kpis = useMemo(() => t ? [
    { key: 'alDia', label: 'Al día', value: t.alDia, style: 'ok', dot: '🟢' },
    { key: 'porVencer', label: 'Por vencer', value: t.porVencer, style: 'soon', dot: '🟡' },
    { key: 'vencido', label: 'Vencido', value: t.vencido, style: 'over', dot: '🔴' },
    { key: 'sinRegistro', label: 'Sin registro', value: t.sinRegistro, style: 'none', dot: '⚪' },
  ] : [], [t]);

  if (!partnerId) return <div className="page-container"><p>Tu cuenta no está vinculada a un barrio.</p></div>;

  return (
    <div className="pdash bcomp" style={{ '--brand': brand }}>
      <header className="pdash-top">
        <div className="pdash-brand">
          <Link to="/dashboard" className="pdash-back" aria-label="Volver">←</Link>
          {report?.partner?.branding?.logoUrl
            ? <img src={report.partner.branding.logoUrl} alt={appName} className="pdash-logo" />
            : <span className="pdash-logo pdash-logo-ph">{appName.charAt(0)}</span>}
          <div>
            <h1 className="pdash-name">{appName}</h1>
            <span className="pdash-type">Barrio · cumplimiento antirrábica</span>
          </div>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="pdash-skeleton"><div className="pdash-sk-hero" /><div className="pdash-sk-grid" /></div>
      ) : report && t.pets === 0 ? (
        <div className="pdash-empty card">
          <span className="pdash-empty-icon">🐾</span>
          <h2>Todavía no hay mascotas registradas</h2>
          <p>Cuando los propietarios registren a su perro desde la app del barrio, vas a ver acá el estado de vacunación por unidad.</p>
        </div>
      ) : report ? (
        <>
          {/* North Star: % de mascotas con antirrábica vigente */}
          <section className="pdash-hero bcomp-hero">
            <div className="bcomp-hero-ring"><ComplianceRing value={report.complianceRate} /></div>
            <div className="bcomp-hero-copy">
              <span className="pdash-hero-eyebrow">Antirrábica vigente</span>
              <span className="pdash-hero-sub" style={{ opacity: 1, fontSize: '1rem', marginTop: 6 }}>
                <strong>{t.alDia + t.porVencer}</strong> de <strong>{t.pets}</strong> mascotas al día · {t.units} unidades
              </span>
              {(t.vencido + t.sinRegistro) > 0 && (
                <span className="bcomp-hero-alert">⚠ {t.vencido + t.sinRegistro} requieren atención</span>
              )}
            </div>
          </section>

          {/* Distribución del semáforo */}
          <div className="bcomp-kpis">
            {kpis.map((k) => (
              <div key={k.key} className={`bcomp-kpi ${k.style}`}>
                <span className="bcomp-kpi-num">{k.value}</span>
                <span className="bcomp-kpi-label">{k.dot} {k.label}</span>
              </div>
            ))}
          </div>

          {/* Tabla por unidad — accionable primero (vencido / sin registro) */}
          <section className="card pdash-card">
            <h2 className="pdash-card-title">Cumplimiento por unidad</h2>
            <div className="bcomp-tablewrap">
              <table className="bcomp-table">
                <thead>
                  <tr><th>Unidad</th><th className="bcomp-c">Mascotas</th><th>Estado</th><th>Próx. vencimiento</th></tr>
                </thead>
                <tbody>
                  {report.units.map((u) => {
                    const s = STATUS_STYLE[u.statusColor] || STATUS_STYLE.grey;
                    return (
                      <tr key={u.unit}>
                        <td className="bcomp-unit">{u.unit}</td>
                        <td className="bcomp-c">{u.pets}</td>
                        <td><span className={`bcomp-pill ${s.cls}`}>{s.dot} {u.statusLabel}</span></td>
                        <td className="bcomp-due">{fmtDate(u.nextDueDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="pdash-note">
              Minimización de datos (Ley 25.326 / 18.331): la administración ve únicamente el estado de cumplimiento
              antirrábica por unidad — nunca el historial clínico, ni el nombre del tutor o de la mascota.
            </p>
          </section>

          <footer className="pdash-footer">
            {user?.name ? <span>Sesión: {user.name}</span> : <span />}
            <span>Actualizado {report.generatedAt ? new Date(report.generatedAt).toLocaleString('es-AR') : ''}</span>
          </footer>
        </>
      ) : null}
    </div>
  );
}
