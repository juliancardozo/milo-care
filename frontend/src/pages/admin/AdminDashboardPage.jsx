import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, sendAdminTestEmail } from '../../services/api';

function StatCard({ label, value, sub }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-value">{value ?? '—'}</p>
      <p className="admin-stat-label">{label}</p>
      {sub && <p className="admin-stat-sub">{sub}</p>}
    </div>
  );
}

const EMAIL_TYPES = [
  { key: 'welcome',      label: 'Bienvenida' },
  { key: 'vaccination',  label: 'Vacuna' },
  { key: 'deworming',    label: 'Desparasitación' },
  { key: 'medication',   label: 'Medicamento' },
  { key: 'appointment',  label: 'Cita veterinaria' },
  { key: 'passwordReset', label: 'Restablecer contraseña' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testType, setTestType] = useState('welcome');
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Panel de administración</h1>
        <Link to="/dashboard" className="btn-secondary btn-sm">← App</Link>
      </header>

      {error && <p className="server-error">{error}</p>}

      {loading ? (
        <p>Cargando estadísticas…</p>
      ) : stats && (
        <>
          <section className="admin-stat-grid">
            <StatCard label="Usuarios totales" value={stats.users.total} />
            <StatCard label="Plan free" value={stats.users.free} />
            <StatCard label="Plan premium" value={stats.users.premium} />
            <StatCard label="Administradores" value={stats.users.admins} />
            <StatCard label="Perros registrados" value={stats.dogs.total} />
          </section>

          <section className="admin-stat-grid" style={{ marginTop: '8px' }}>
            <StatCard
              label="Leads totales"
              value={stats.leads?.total ?? 0}
              sub="landing page"
            />
            <StatCard
              label="Beta gratuita"
              value={stats.leads?.signups ?? 0}
              sub="signup form"
            />
            <StatCard
              label="Founder Plan"
              value={stats.leads?.founders ?? 0}
              sub="acceso pago"
            />
          </section>

          <nav className="card" style={{ marginTop: '16px' }}>
            <h2>Gestión</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <li><Link to="/admin/users">👥 Gestionar usuarios →</Link></li>
              <li><Link to="/admin/clinics">🏥 Gestionar clínicas (Kit Vet) →</Link></li>
              <li><Link to="/admin/partners">🤝 Gestionar partners (B2B2C) →</Link></li>
              <li><Link to="/admin/leads">📋 Ver leads de la landing →</Link></li>
            </ul>
          </nav>

          <section className="card" style={{ marginTop: '12px' }}>
            <h2>Correos de notificación</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginTop: '6px' }}>
              Previsualizar o enviar un correo de prueba a tu dirección de admin.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={testType}
                onChange={(e) => { setTestType(e.target.value); setTestStatus(''); }}
                className="admin-inline-select"
                style={{ padding: '8px 10px', fontSize: '0.875rem' }}
              >
                {EMAIL_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>

              <a
                href={`/api/admin/email/preview/${testType}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                👁 Previsualizar
              </a>

              <button
                className="btn-sm"
                onClick={async () => {
                  setTestStatus('Enviando…');
                  try {
                    await sendAdminTestEmail(testType);
                    setTestStatus('✓ Enviado a tu correo.');
                  } catch {
                    setTestStatus('✗ Error al enviar.');
                  }
                }}
              >
                📨 Enviar prueba
              </button>

              {testStatus && (
                <span style={{ fontSize: '0.875rem', color: testStatus.startsWith('✓') ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {testStatus}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
