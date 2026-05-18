import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials, selectCurrentUser, selectIsAdmin } from '../store/authSlice';
import { logout } from '../services/api';

export default function UserMenu({ dogs = [] }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try { await logout(); } catch { /* ignore */ }
    dispatch(clearCredentials());
    navigate('/login');
  }

  if (!user) return null;

  const initial = (user.name || '?').charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="user-menu-avatar">{initial}</span>
        <span className="user-menu-name">{user.name?.split(' ')[0]}</span>
        <span className="user-menu-chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <nav className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <div className="user-menu-section-label">Perros</div>
          {dogs.length > 0 ? (
            dogs.map((dog) => (
              <Link
                key={dog.id}
                to={`/dogs/${dog.id}/edit`}
                className="user-menu-item"
                onClick={() => setOpen(false)}
              >
                ✏️ Editar ficha de {dog.name}
              </Link>
            ))
          ) : (
            <Link to="/dogs/new" className="user-menu-item" onClick={() => setOpen(false)}>
              + Agregar primer perro
            </Link>
          )}
          <Link to="/dogs" className="user-menu-item" onClick={() => setOpen(false)}>
            🐾 Mis perros
          </Link>

          <div className="user-menu-divider" />

          {isAdmin && (
            <>
              <div className="user-menu-section-label">Administración</div>
              <Link to="/admin" className="user-menu-item" onClick={() => setOpen(false)}>
                ⚙️ Panel de admin
              </Link>
              <div className="user-menu-divider" />
            </>
          )}

          <div className="user-menu-section-label">Cuenta</div>
          <Link to="/settings/account" className="user-menu-item" onClick={() => setOpen(false)}>
            👤 Editar cuenta
          </Link>
          <Link to="/settings/notifications" className="user-menu-item" onClick={() => setOpen(false)}>
            🔔 Notificaciones
          </Link>

          <div className="user-menu-divider" />

          <button className="user-menu-item user-menu-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </nav>
      )}
    </div>
  );
}
