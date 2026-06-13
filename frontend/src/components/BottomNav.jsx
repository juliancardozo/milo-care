import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { generateWalletPass } from '../services/walletApi';
import { useInstallPrompt } from '../utils/pwaInstall';
import '../styles/bottom-nav.css';

const HEALTH_KEYS = ['vaccinations', 'medications', 'appointments', 'symptoms', 'history'];
const HEALTH_EMOJI = { vaccinations: '💉', medications: '💊', appointments: '🏥', symptoms: '🩺', history: '📋' };

/**
 * Barra de navegación inferior, solo móvil (oculta en desktop por CSS).
 * Patrón de app nativa, acciones al alcance del pulgar:
 *   Inicio · Salud · ➕ (registro rápido) · Álbum · Más
 * "Salud" y "Más" abren hojas inferiores (bottom sheets) en vez de saturar el
 * dashboard: la salud completa vive en su hoja, no como sección bajo el panel.
 * El "+" central abre la hoja de QuickActions vía onQuickAdd.
 */
export default function BottomNav({ dogId, onQuickAdd }) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState(null); // 'health' | 'more' | null
  const [walletLoading, setWalletLoading] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const { installable, installed, ios, promptInstall } = useInstallPrompt();
  const showInstall = !installed && (installable || ios);

  // Bloquea el scroll del fondo mientras una hoja está abierta.
  useEffect(() => {
    if (sheet) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheet]);

  const close = () => { setSheet(null); setIosHint(false); };

  async function handleWallet() {
    if (!dogId || walletLoading) return;
    setWalletLoading(true);
    try {
      const { data } = await generateWalletPass(dogId);
      window.open(data.saveUrl, '_blank', 'noopener');
      close();
    } catch {
      // silencioso: el flujo de Wallet puede estar deshabilitado
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleInstall() {
    if (installable) {
      await promptInstall();
      close();
    } else if (ios) {
      setIosHint((v) => !v);
    }
  }

  const healthItems = dogId
    ? HEALTH_KEYS.map((k) => ({ key: k, emoji: HEALTH_EMOJI[k], label: t(`dashboard.sections.${k}.label`), to: `/dogs/${dogId}/${k}` }))
    : [];

  const moreItems = [
    dogId && { key: 'wallet', emoji: '🪪', label: walletLoading ? t('explore.wallet.loading') : t('explore.wallet.title'), onClick: handleWallet },
    showInstall && { key: 'install', emoji: '⬇️', label: t('explore.install.title'), onClick: handleInstall },
    dogId && { key: 'cards', emoji: '🎨', label: t('explore.cards.title'), to: `/dogs/${dogId}/cards` },
    dogId && { key: 'pdf', emoji: '📄', label: t('explore.pdf.title'), to: `/dogs/${dogId}/pdf-export` },
    { key: 'addDog', emoji: '🐶', label: t('explore.addDog.title'), to: '/dogs/new' },
    { key: 'notif', emoji: '🔔', label: t('explore.notifications.title'), to: '/settings/notifications' },
    { key: 'account', emoji: '👤', label: t('bottomNav.account'), to: '/settings/account' },
  ].filter(Boolean);

  const sheetData = sheet === 'health'
    ? { title: t('bottomNav.health'), items: healthItems }
    : sheet === 'more'
      ? { title: t('bottomNav.moreTitle'), items: moreItems }
      : null;

  return (
    <>
      <nav className="bottom-nav" aria-label={t('bottomNav.moreTitle')}>
        <NavLink to="/dashboard" end className="bn-tab">
          <span className="bn-icon" aria-hidden="true">🏠</span>
          <span className="bn-label">{t('bottomNav.home')}</span>
        </NavLink>

        <button
          type="button"
          className={`bn-tab bn-sheet-trigger ${sheet === 'health' ? 'active' : ''}`}
          onClick={() => setSheet((s) => (s === 'health' ? null : 'health'))}
          aria-expanded={sheet === 'health'}
        >
          <span className="bn-icon" aria-hidden="true">🩺</span>
          <span className="bn-label">{t('bottomNav.health')}</span>
        </button>

        <button type="button" className="bn-add" onClick={onQuickAdd} aria-label={t('bottomNav.add')}>
          <span className="bn-add-plus" aria-hidden="true">+</span>
        </button>

        <NavLink to={dogId ? `/dogs/${dogId}/album` : '/dashboard'} className="bn-tab">
          <span className="bn-icon" aria-hidden="true">📸</span>
          <span className="bn-label">{t('bottomNav.album')}</span>
        </NavLink>

        <button
          type="button"
          className={`bn-tab bn-sheet-trigger ${sheet === 'more' ? 'active' : ''}`}
          onClick={() => setSheet((s) => (s === 'more' ? null : 'more'))}
          aria-expanded={sheet === 'more'}
        >
          <span className="bn-icon" aria-hidden="true">⋯</span>
          <span className="bn-label">{t('bottomNav.more')}</span>
        </button>
      </nav>

      {sheetData && (
        <div className="bn-sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="bn-sheet" role="dialog" aria-label={sheetData.title}>
            <div className="bn-sheet-grip" aria-hidden="true" />
            <h3 className="bn-sheet-title">{sheetData.title}</h3>
            <div className="bn-sheet-grid">
              {sheetData.items.map((it) => (
                it.to ? (
                  <Link key={it.key} to={it.to} className="bn-sheet-item" onClick={close}>
                    <span className="bn-sheet-emoji" aria-hidden="true">{it.emoji}</span>
                    <span className="bn-sheet-label">{it.label}</span>
                  </Link>
                ) : (
                  <button key={it.key} type="button" className="bn-sheet-item" onClick={it.onClick}>
                    <span className="bn-sheet-emoji" aria-hidden="true">{it.emoji}</span>
                    <span className="bn-sheet-label">{it.label}</span>
                  </button>
                )
              ))}
            </div>
            {sheet === 'more' && ios && iosHint && <p className="bn-sheet-hint">{t('explore.install.iosHint')}</p>}
          </div>
        </div>
      )}
    </>
  );
}
