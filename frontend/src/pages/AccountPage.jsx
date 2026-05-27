import { useState } from 'react';
import { Link } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, updateUser } from '../store/authSlice';
import { updateProfile } from '../services/api';

export default function AccountPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('El nombre no puede estar vacío.'); return; }
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const { data } = await updateProfile({ name: trimmed });
      dispatch(updateUser({ name: data.name }));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <BackLink to="/dashboard" />
      <header className="page-header">
        <h1>Mi cuenta</h1>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <h2>Datos personales</h2>

        <div className="field">
          <label htmlFor="account-name">Nombre</label>
          <input
            id="account-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(false); }}
            required
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          <span className="field-error" style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
            El email no se puede cambiar desde aquí.
          </span>
        </div>

        <div className="field">
          <label>Plan</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input value={user?.tier === 'premium' ? 'Milo Care Premium' : 'Milo Care Free'} disabled style={{ opacity: 0.6 }} />
            {user?.tier === 'premium' ? (
              <Link to="/subscription" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Gestionar</Link>
            ) : (
              <Link to="/upgrade" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>⭐ Mejorar plan</Link>
            )}
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}
        {success && <p className="success-message">Nombre actualizado correctamente.</p>}

        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      <div className="card" style={{ marginTop: '12px' }}>
        <h2>Otras configuraciones</h2>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <li><Link to="/settings/notifications">Preferencias de notificaciones →</Link></li>
          <li><Link to="/dogs">Mis perros →</Link></li>
        </ul>
      </div>

    </div>
  );
}
