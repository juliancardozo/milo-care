import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DogAvatar from './DogAvatar';
import HealthScoreCard from './HealthScoreCard';
import AddToWalletButton from './AddToWalletButton';
import { useI18n } from '../i18n/I18nProvider';

/**
 * Hero unificado del dashboard: switcher de perros (primero) + identidad del
 * perro activo + Health Score inline + menú "⋯" con las acciones del perfil.
 * Reemplaza las dog-tabs sueltas, la tarjeta de perfil azul y el health score
 * apilado — el contexto (qué perro) va antes que el contenido.
 */
export default function DogContextHeader({ dogs, activeDogId, onSelect }) {
  const { t } = useI18n();
  const activeDog = dogs.find((d) => d.id === activeDogId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (!activeDog) return null;

  const ageLabel = activeDog.ageDisplay ?? `${activeDog.ageYears} ${t('dashboard.yearsOld')}`;

  return (
    <section className="dog-hero">
      {/* Switcher de perros (primero) */}
      {dogs.length > 1 && (
        <nav className="dog-hero-switcher" aria-label={t('dashboard.switchDog')}>
          {dogs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={`dog-chip ${d.id === activeDogId ? 'active' : ''}`}
            >
              <DogAvatar dog={d} className="dog-chip-avatar" />
              <span className="dog-chip-name">{d.name}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="dog-hero-main">
        {/* Identidad del perro activo */}
        <div className="dog-hero-id">
          <DogAvatar dog={activeDog} className="dog-hero-avatar" />
          <div className="dog-hero-id-text">
            <h1 className="dog-hero-name">{activeDog.name}</h1>
            <p className="dog-hero-meta">{activeDog.breed} · {ageLabel}</p>
            {activeDog.shared && (
              <span className="dog-hero-shared">👥 {t('cotutor.sharedBadge', { owner: activeDog.ownerName || '' })}</span>
            )}
          </div>

          {/* Menú "⋯" con las acciones del perfil */}
          <div className="dog-hero-kebab" ref={menuRef}>
            <button
              type="button"
              className="dog-hero-kebab-btn"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={t('dashboard.moreActions')}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="dog-hero-menu" role="menu">
                <Link to={`/dogs/${activeDog.id}/edit`} className="dog-hero-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <span aria-hidden="true">✏️</span> {t('dashboard.editProfile')}
                </Link>
                {!activeDog.shared && (
                  <Link to={`/dogs/${activeDog.id}/cotutores`} className="dog-hero-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <span aria-hidden="true">👥</span> {t('cotutor.addAction')}
                  </Link>
                )}
                <div className="dog-hero-menu-wallet">
                  <AddToWalletButton dogId={activeDog.id} className="dog-hero-wallet" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Health Score inline */}
        <HealthScoreCard dogId={activeDog.id} dogName={activeDog.name} variant="inline" />
      </div>
    </section>
  );
}
