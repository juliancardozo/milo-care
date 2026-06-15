import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { generateWalletPass } from '../services/walletApi';
import { useInstallPrompt } from '../utils/pwaInstall';
import '../styles/explore-menu.css';

/**
 * Menú "Explorar" del top bar. Diseñado para incitar la navegación:
 * - CTA masivo arriba de todo (Wallet) con punto pulsante y flecha,
 * - filas con tile de color + microcopy de beneficio (brecha de curiosidad),
 * - badge "Nuevo" para disparar curiosidad.
 */
export default function ExploreMenu({ dogId, dogName = '', isPremium }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const ref = useRef(null);
  const { installable, installed, ios, promptInstall } = useInstallPrompt();
  const showInstall = !installed && (installable || ios);

  async function handleInstall() {
    if (installable) {
      await promptInstall();
      setOpen(false);
    } else if (ios) {
      setIosHint((v) => !v);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleWallet() {
    if (!dogId || walletLoading) return;
    setWalletLoading(true);
    try {
      const { data } = await generateWalletPass(dogId);
      window.open(data.saveUrl, '_blank', 'noopener');
      setOpen(false);
    } catch {
      // silencioso: el flujo de Wallet puede estar deshabilitado
    } finally {
      setWalletLoading(false);
    }
  }

  const items = [
    dogId && { to: `/dogs/${dogId}/cards`, emoji: '🎨', tone: 'violet', title: t('explore.cards.title'), sub: t('explore.cards.sub'), badge: t('explore.new') },
    dogId && { to: `/dogs/${dogId}/album`, emoji: '📸', tone: 'amber', title: t('explore.album.title'), sub: t('explore.album.sub') },
    dogId && { to: `/dogs/${dogId}/pdf-export`, emoji: '📄', tone: 'teal', title: t('explore.pdf.title'), sub: t('explore.pdf.sub') },
    dogId && { to: `/dogs/${dogId}/share`, emoji: '🏥', tone: 'blue', title: t('explore.vetShare.title'), sub: t('explore.vetShare.sub') },
    dogId && { to: `/dogs/${dogId}/cotutores`, emoji: '👥', tone: 'violet', title: t('cotutor.manageTitle'), sub: t('cotutor.menuSub') },
    { to: isPremium ? '/dogs/new' : '/upgrade', emoji: '🐶', tone: 'blue', title: t('explore.addDog.title'), sub: t('explore.addDog.sub') },
    { to: '/settings/notifications', emoji: '🔔', tone: 'green', title: t('explore.notifications.title'), sub: t('explore.notifications.sub') },
  ].filter(Boolean);

  return (
    <div className="explore-menu" ref={ref}>
      <button
        className={`explore-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="explore-trigger-icon" aria-hidden="true">✨</span>
        <span className="explore-trigger-label">{t('explore.trigger')}</span>
        <span className="explore-trigger-dot" aria-hidden="true" />
      </button>

      {open && (
        <nav className="explore-dropdown" role="menu">
          <div className="explore-head">
            <strong>{t('explore.headTitle')}</strong>
            <span>{t('explore.headSub')}</span>
          </div>

          {/* CTA masivo: agregar a Wallet */}
          {dogId && (
            <button className="explore-cta" onClick={handleWallet} disabled={walletLoading}>
              <span className="explore-cta-tile" aria-hidden="true">🪪</span>
              <span className="explore-cta-text">
                <strong>{walletLoading ? t('explore.wallet.loading') : t('explore.wallet.title')}</strong>
                <span>{t('explore.wallet.sub', { dog: dogName || t('explore.yourDog') })}</span>
              </span>
              <span className="explore-cta-arrow" aria-hidden="true">→</span>
            </button>
          )}

          {/* CTA secundario: instalar la app (habilita push + engagement) */}
          {showInstall && (
            <>
              <button className="explore-install" onClick={handleInstall}>
                <span className="explore-install-icon" aria-hidden="true">⬇️</span>
                <span className="explore-cta-text">
                  <strong>{t('explore.install.title')}</strong>
                  <span>{t('explore.install.sub')}</span>
                </span>
                <span className="explore-install-badge">{t('explore.install.badge')}</span>
              </button>
              {ios && iosHint && <p className="explore-install-hint">{t('explore.install.iosHint')}</p>}
            </>
          )}

          {items.map((it) => (
            <Link key={it.to} to={it.to} className="explore-item" role="menuitem" onClick={() => setOpen(false)}>
              <span className={`explore-tile explore-tile-${it.tone}`} aria-hidden="true">{it.emoji}</span>
              <span className="explore-item-text">
                <span className="explore-item-title">
                  {it.title}
                  {it.badge && <span className="explore-badge">{it.badge}</span>}
                </span>
                <span className="explore-item-sub">{it.sub}</span>
              </span>
              <span className="explore-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
