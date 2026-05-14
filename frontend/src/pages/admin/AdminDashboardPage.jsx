import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../services/api';

function StatCard({ label, value, sub }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-value">{value ?? '—'}</p>
      <p className="admin-stat-label">{label}</p>
      {sub && <p className="admin-stat-sub">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

          <nav className="card" style={{ marginTop: '16px' }}>
            <h2>Gestión</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <li><Link to="/admin/users">👥 Gestionar usuarios →</Link></li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
