import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../../services/api';

const ROLE_LABELS = { user: 'Usuario', admin: 'Admin' };

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((currentPage, currentSearch) => {
    setLoading(true);
    setError('');
    getAdminUsers({ page: currentPage, limit: 20, search: currentSearch })
      .then(({ data }) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError('No se pudo cargar la lista de usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleTierChange(userId, newTier) {
    try {
      const { data } = await updateAdminUser(userId, { tier: newTier });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, tier: data.tier } : u));
    } catch {
      setError('No se pudo actualizar el plan.');
    }
  }

  async function handleRoleChange(userId, newRole) {
    if (!window.confirm(`¿Cambiar el rol a "${ROLE_LABELS[newRole]}"?`)) return;
    try {
      const { data } = await updateAdminUser(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.role } : u));
    } catch {
      setError('No se pudo actualizar el rol.');
    }
  }

  async function handleDelete(userId, name) {
    if (!window.confirm(`¿Eliminar la cuenta de "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el usuario.');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Usuarios <span className="admin-total-badge">{total}</span></h1>
        <Link to="/admin" className="btn-secondary btn-sm">← Admin</Link>
      </header>

      <form onSubmit={handleSearch} className="admin-search-form">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="admin-search-input"
        />
        <button type="submit">Buscar</button>
        {search && (
          <button type="button" className="btn-secondary" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
            Limpiar
          </button>
        )}
      </form>

      {error && <p className="server-error">{error}</p>}

      {loading ? <p>Cargando…</p> : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Rol</th>
                  <th>Perros</th>
                  <th>Registrado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Sin resultados</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button className="admin-link-btn" onClick={() => navigate(`/admin/users/${u.id}`)}>
                        {u.name}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.tier}
                        onChange={(e) => handleTierChange(u.id, e.target.value)}
                        className="admin-inline-select"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="admin-inline-select"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>{u.dogCount}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es-AR')}
                    </td>
                    <td>
                      <button
                        className="btn-danger-sm"
                        onClick={() => handleDelete(u.id, u.name)}
                        title="Eliminar cuenta"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="admin-pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary btn-sm">
                ← Anterior
              </button>
              <span>Página {page} de {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm">
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
