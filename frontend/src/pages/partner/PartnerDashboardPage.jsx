import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectPartnerId, selectCurrentUser } from '../../store/authSlice';
import { getPartnerMetrics, getPartnerBilling } from '../../services/partnerAdminApi';
import '../../styles/partner-dashboard.css';

// ── helpers de mes ──────────────────────────────────────────────────────────
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const curMonth = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
function addMonths(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const monthLabel = (month) => { const [y, m] = month.split('-').map(Number); return `${MONTHS_ES[m - 1]} ${y}`; };
const pct = (r) => `${Math.round((r || 0) * 100)}%`;
const money = (n, c) => `${(n || 0).toLocaleString('es-UY')} ${c || ''}`.trim();

const EVENT_META = {
  vaccinations: { label: 'Vacunas', icon: '💉' }, deworming: { label: 'Desparasitación', icon: '🪱' },
  medications: { label: 'Medicación', icon: '💊' }, appointments: { label: 'Citas', icon: '📅' },
  symptoms: { label: 'Síntomas', icon: '🩺' }, consultations: { label: 'Consultas', icon: '📋' },
};
const BILLING_STATUS = {
  paid: { label: 'Cobrada', cls: 'paid' }, issued: { label: 'Emitida', cls: 'issued' },
  failed: { label: 'Cobro fallido', cls: 'failed' }, draft: { label: 'Borrador', cls: 'issued' },
};

// Anillo de progreso 0–100% (adherencia / retención).
function Ring({ value, label, color }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="pdash-ring">
      <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
        <circle cx="40" cy="40" r={R} className="pdash-ring-bg" />
        <circle cx="40" cy="40" r={R} stroke={color} strokeDasharray={C} strokeDashoffset={C * (1 - v)} className="pdash-ring-fg" />
        <text x="40" y="45" className="pdash-ring-num">{pct(v)}</text>
      </svg>
      <span className="pdash-ring-label">{label}</span>
    </div>
  );
}

export default function PartnerDashboardPage() {
  const partnerId = useSelector(selectPartnerId);
  const user = useSelector(selectCurrentUser);
  const [month, setMonth] = useState(curMonth());
  const [metrics, setMetrics] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }
    let ignore = false;
    setLoading(true);
    setError('');
    Promise.all([getPartnerMetrics(partnerId, month), getPartnerBilling(partnerId, month)])
      .then(([m, b]) => { if (!ignore) { setMetrics(m.data); setBilling(b.data); } })
      .catch((err) => { if (!ignore) setError(err.response?.data?.message || 'No pudimos cargar el panel.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [partnerId, month]);

  const brand = metrics?.partner?.branding?.primaryColor || '#4f8ef7';
  const appName = metrics?.partner?.branding?.appName || metrics?.partner?.name || 'Partner';
  const isFuture = month >= curMonth();

  const retentionDelta = useMemo(() => {
    if (!metrics) return null;
    return (metrics.activePets || 0) - (metrics.activePrevMonth || 0);
  }, [metrics]);

  const maxEvent = useMemo(() => {
    const vals = Object.values(metrics?.eventsByType || {});
    return Math.max(1, ...vals);
  }, [metrics]);

  if (!partnerId) {
    return <div className="page-container"><p>Tu cuenta no está vinculada a un partner.</p></div>;
  }

  return (
    <div className="pdash" style={{ '--brand': brand }}>
      {/* Header con marca + selector de mes */}
      <header className="pdash-top">
        <div className="pdash-brand">
          <Link to="/dashboard" className="pdash-back">←</Link>
          {metrics?.partner?.branding?.logoUrl
            ? <img src={metrics.partner.branding.logoUrl} alt={appName} className="pdash-logo" />
            : <span className="pdash-logo pdash-logo-ph">{appName.charAt(0)}</span>}
          <div>
            <h1 className="pdash-name">{appName}</h1>
            <span className="pdash-type">{metrics?.partner?.type || 'partner'} · panel de cohorte</span>
          </div>
        </div>
        <div className="pdash-monthnav">
          <button className="pdash-mbtn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Mes anterior">‹</button>
          <span className="pdash-month">{monthLabel(month)}</span>
          <button className="pdash-mbtn" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={isFuture} aria-label="Mes siguiente">›</button>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="pdash-skeleton"><div className="pdash-sk-hero" /><div className="pdash-sk-grid" /></div>
      ) : metrics && metrics.totalPets === 0 ? (
        <div className="pdash-empty card">
          <span className="pdash-empty-icon">🐾</span>
          <h2>Aún no hay mascotas en tu cohorte</h2>
          <p>Cuando tus asegurados activen su perfil con tu marca, vas a verlos acá.</p>
        </div>
      ) : metrics ? (
        <>
          {/* North Star: mascotas activas */}
          <section className="pdash-hero">
            <div className="pdash-hero-main">
              <span className="pdash-hero-eyebrow">Mascotas activas · {monthLabel(month)}</span>
              <span className="pdash-hero-num">{metrics.activePets}</span>
              <span className="pdash-hero-sub">de {metrics.totalPets} en tu cohorte</span>
            </div>
            {retentionDelta !== null && (
              <div className={`pdash-delta ${retentionDelta >= 0 ? 'up' : 'down'}`}>
                <span className="pdash-delta-num">{retentionDelta >= 0 ? '▲' : '▼'} {Math.abs(retentionDelta)}</span>
                <span className="pdash-delta-label">vs. mes anterior ({metrics.activePrevMonth})</span>
              </div>
            )}
          </section>

          {/* KPIs */}
          <div className="pdash-kpis">
            <div className="pdash-kpi"><span className="pdash-kpi-num">{metrics.totalPets}</span><span className="pdash-kpi-label">Mascotas totales</span></div>
            <div className="pdash-kpi"><span className="pdash-kpi-num">{metrics.verifiedPets}</span><span className="pdash-kpi-label">Verificadas por vet</span></div>
            <div className="pdash-kpi"><span className="pdash-kpi-num">{metrics.sponsoredPets}</span><span className="pdash-kpi-label">Patrocinadas</span></div>
            <div className="pdash-kpi pdash-kpi-ring"><Ring value={metrics.adherenceRate} label="Adherencia" color={brand} /></div>
            <div className="pdash-kpi pdash-kpi-ring"><Ring value={metrics.retentionRate} label="Retención" color="#22c55e" /></div>
          </div>

          {/* Eventos por tipo */}
          <section className="card pdash-card">
            <h2 className="pdash-card-title">Actividad de salud del mes</h2>
            <ul className="pdash-bars">
              {Object.entries(metrics.eventsByType).map(([k, v]) => (
                <li key={k} className="pdash-bar-row">
                  <span className="pdash-bar-label">{EVENT_META[k]?.icon} {EVENT_META[k]?.label || k}</span>
                  <span className="pdash-bar-track"><span className="pdash-bar-fill" style={{ width: `${(v / maxEvent) * 100}%` }} /></span>
                  <span className="pdash-bar-val">{v}</span>
                </li>
              ))}
            </ul>
            <p className="pdash-note">Solo agregados de la cohorte. Nunca verás datos clínicos individuales ni identidad de los tutores.</p>
          </section>

          {/* Facturación */}
          {billing && (
            <section className="card pdash-card pdash-billing">
              <div className="pdash-billing-head">
                <h2 className="pdash-card-title">Facturación · {monthLabel(billing.month)}</h2>
                <span className={`pdash-badge ${BILLING_STATUS[billing.status]?.cls || 'issued'}`}>{BILLING_STATUS[billing.status]?.label || billing.status}</span>
              </div>
              <ul className="pdash-bill-lines">
                <li><span>Setup fee {billing.setupFeeApplied ? '' : '(ya aplicado)'}</span><strong>{money(billing.setupFeeApplied, billing.currency)}</strong></li>
                <li><span>{billing.activePets} activas × {money(billing.pricePerActivePet, billing.currency)}</span><strong>{money(billing.activePets * billing.pricePerActivePet, billing.currency)}</strong></li>
                {(billing.qualifiedLeads > 0 || billing.convertedPolicies > 0) && (
                  <li><span>Lead-gen ({billing.qualifiedLeads} leads · {billing.convertedPolicies} pólizas)</span><strong>{money(billing.leadRevenue, billing.currency)}</strong></li>
                )}
                <li className="pdash-bill-total"><span>Total</span><strong>{money(billing.total, billing.currency)}</strong></li>
              </ul>
              {billing.chargedAt && <p className="pdash-note">Cobrada el {new Date(billing.chargedAt).toLocaleDateString('es-UY')}{billing.chargeRef ? ` · ref ${billing.chargeRef}` : ''}.</p>}
            </section>
          )}

          <footer className="pdash-footer">
            {user?.name ? <span>Sesión: {user.name}</span> : <span />}
            <a href="/developers" className="pdash-apilink">Integración / API v1 →</a>
          </footer>
        </>
      ) : null}
    </div>
  );
}
