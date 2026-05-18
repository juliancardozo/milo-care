import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAdminUser, updateAdminUser, deleteAdminUser } from '../../services/api';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', tier: 'free', role: 'user' });

  useEffect(() => {
    getAdminUser(id)
      .then(({ data }) => {
        setUser(data);
        setForm({ name: data.name, tier: data.tier, role: data.role });
      })
      .catch(() => setError('No se pudo cargar el usuario.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await updateAdminUser(id, form);
      setUser((prev) => ({ ...prev, ...data }));
      setSuccess('Cambios guardados.');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar la cuenta de "${user.name}"? Esta acción es permanente.`)) return;
    try {
      await deleteAdminUser(id);
      navigate('/admin/users');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar.');
    }
  }

  if (loading) return <div className="page"><p>Cargando…</p></div>;
  if (error && !user) return <div className="page"><p className="server-error">{error}</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Usuario: {user.name}</h1>
        <Link to="/admin/users" className="btn-secondary btn-sm">← Usuarios</Link>
      </header>

      {/* Edit form */}
      <form onSubmit={handleSave} className="card" style={{ marginBottom: '12px' }}>
        <h2>Datos de la cuenta</h2>

        <div className="field">
          <label htmlFor="adm-name">Nombre</label>
          <input
            id="adm-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="adm-email">Email</label>
          <input id="adm-email" value={user.email} disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="field">
          <label htmlFor="adm-tier">Plan</label>
          <select id="adm-tier" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="adm-role">Rol</label>
          <select id="adm-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>
          Registrado: {new Date(user.createdAt).toLocaleDateString('es-AR')}
        </div>

        {error && <p className="field-error">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      {/* Dogs */}
      <section className="card" style={{ marginBottom: '12px' }}>
        <h2>Perros ({user.dogs.length})</h2>
        {user.dogs.length === 0 ? (
          <p className="list-empty">Sin perros registrados.</p>
        ) : (
          <ul className="record-list">
            {user.dogs.map((dog) => (
              <li key={dog.id} className="record-item">
                <div className="record-info">
                  <h3>{dog.name}</h3>
                  <p>{dog.breed}</p>
                  {dog.dateOfBirth && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      Nacimiento: {new Date(dog.dateOfBirth).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'right' }}>
                  <div>{dog.vaccinationCount} vacunas</div>
                  <div>{dog.appointmentCount} citas</div>
                  <div>{dog.medicationCount} meds</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Danger zone */}
      <section className="card admin-danger-zone">
        <h2>Zona de peligro</h2>
        <p>Eliminar esta cuenta borra permanentemente todos los datos del usuario y sus perros.</p>
        <button type="button" className="btn-danger" onClick={handleDelete} style={{ marginTop: '12px' }}>
          Eliminar cuenta
        </button>
      </section>
    </div>
  );
}
