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
  const [editOpen, setEditOpen] = useState(false);
  const ref = useRef(null);

  const close = () => { setOpen(false); setEditOpen(false); };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) close();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleLogout() {
    close();
    try { await logout(); } catch { /* ignore */ }
    dispatch(clearCredentials());
    navigate('/login');
  }

  if (!user) return null;

  const initial = (user.name || '?').charAt(0).toUpperCase();
  const dogInitial = (name) => (name || '?').charAt(0).toUpperCase();

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
          <Link to="/dogs" className="user-menu-item" onClick={close}>
            🐾 Mis perros
          </Link>

          {dogs.length === 0 ? (
            <Link to="/dogs/new" className="user-menu-item" onClick={close}>
              ➕ Agregar primer perro
            </Link>
          ) : dogs.length === 1 ? (
            <Link to={`/dogs/${dogs[0].id}/edit`} className="user-menu-item" onClick={close}>
              ✏️ Editar ficha de {dogs[0].name}
            </Link>
          ) : (
            <>
              {/* Segundo nivel: en vez de listar N fichas, una sola entrada que
                  despliega los perros (con scroll si son muchos). */}
              <button
                className={`user-menu-item user-menu-expand ${editOpen ? 'open' : ''}`}
                onClick={() => setEditOpen((v) => !v)}
                aria-expanded={editOpen}
              >
                <span>✏️ Editar una ficha</span>
                <span className="user-menu-expand-meta">
                  <span className="user-menu-count">{dogs.length}</span>
                  <span className="user-menu-caret" aria-hidden="true">{editOpen ? '▾' : '▸'}</span>
                </span>
              </button>
              {editOpen && (
                <div className="user-menu-sublist">
                  {dogs.map((dog) => (
                    <Link
                      key={dog.id}
                      to={`/dogs/${dog.id}/edit`}
                      className="user-menu-subitem"
                      onClick={close}
                    >
                      {dog.photoUrl
                        ? <img src={dog.photoUrl} alt="" className="user-menu-subavatar" />
                        : <span className="user-menu-subavatar placeholder">{dogInitial(dog.name)}</span>}
                      <span className="user-menu-subname">{dog.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="user-menu-divider" />

          {isAdmin && (
            <>
              <div className="user-menu-section-label">Administración</div>
              <Link to="/admin" className="user-menu-item" onClick={close}>
                ⚙️ Panel de admin
              </Link>
              <div className="user-menu-divider" />
            </>
          )}

          <div className="user-menu-section-label">Cuenta</div>
          <Link to="/settings/account" className="user-menu-item" onClick={close}>
            👤 Editar cuenta
          </Link>
          <Link to="/settings/notifications" className="user-menu-item" onClick={close}>
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
