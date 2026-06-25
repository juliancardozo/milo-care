import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectPartnerId, selectCurrentUser } from '../../store/authSlice';
import { getPartnerMetrics, getPartnerBilling } from '../../services/partnerAdminApi';
import '../../styles/partner-dashboard.css';

const pct = (r) => `${Math.round((r || 0) * 100)}%`;
const money = (n, c) => `${(n || 0).toLocaleString('es-UY')} ${c || ''}`.trim();

const EVENT_LABELS = {
  vaccinations: 'Vacunas', deworming: 'Desparasitación', medications: 'Medicación',
  appointments: 'Citas', symptoms: 'Síntomas', consultations: 'Consultas',
};

export default function PartnerDashboardPage() {
  const partnerId = useSelector(selectPartnerId);
  const user = useSelector(selectCurrentUser);
  const [metrics, setMetrics] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }
    Promise.all([getPartnerMetrics(partnerId), getPartnerBilling(partnerId)])
      .then(([m, b]) => { setMetrics(m.data); setBilling(b.data); })
      .catch((err) => setError(err.response?.data?.message || 'No pudimos cargar el panel.'))
      .finally(() => setLoading(false));
  }, [partnerId]);

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;
  if (!partnerId) return <div className="page-container"><p>Tu cuenta no está vinculada a un partner.</p></div>;
  if (error) return <div className="page-container"><p className="form-error">{error}</p></div>;

  return (
    <div className="page-container pd-page">
      <Link to="/dashboard" className="back-link">← Inicio</Link>
      <h1 className="pd-title">Panel del partner</h1>
      <p className="pd-sub">{user?.name ? `Hola, ${user.name}. ` : ''}Métricas agregadas de tu cohorte · {metrics?.month}</p>

      {/* Métricas agregadas (sin datos individuales) */}
      <div className="pd-stats">
        <div className="pd-stat"><span className="pd-stat-num">{metrics?.totalPets ?? 0}</span><span className="pd-stat-label">Mascotas</span></div>
        <div className="pd-stat"><span className="pd-stat-num">{metrics?.activePets ?? 0}</span><span className="pd-stat-label">Activas (mes)</span></div>
        <div className="pd-stat"><span className="pd-stat-num">{pct(metrics?.adherenceRate)}</span><span className="pd-stat-label">Adherencia</span></div>
        <div className="pd-stat"><span className="pd-stat-num">{pct(metrics?.retentionRate)}</span><span className="pd-stat-label">Retención</span></div>
      </div>

      <section className="card pd-card">
        <h2>Eventos del mes por tipo</h2>
        <ul className="pd-events">
          {Object.entries(metrics?.eventsByType || {}).map(([k, v]) => (
            <li key={k}><span>{EVENT_LABELS[k] || k}</span><strong>{v}</strong></li>
          ))}
        </ul>
      </section>

      {/* Facturación */}
      <section className="card pd-card">
        <h2>Facturación · {billing?.month}</h2>
        <ul className="pd-billing">
          <li><span>Setup fee</span><strong>{money(billing?.setupFeeApplied, billing?.currency)}</strong></li>
          <li><span>Mascotas activas × precio</span><strong>{billing?.activePets} × {money(billing?.pricePerActivePet, billing?.currency)}</strong></li>
          <li className="pd-total"><span>Total</span><strong>{money(billing?.total, billing?.currency)}</strong></li>
        </ul>
        <p className="pd-note">Reporte de facturación del mes. Estado: {billing?.status}.</p>
      </section>
    </div>
  );
}
