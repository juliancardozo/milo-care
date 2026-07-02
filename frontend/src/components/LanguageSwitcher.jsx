import { useI18n } from '../i18n/I18nProvider';

// Toggle de idioma de una sola acción: muestra el idioma actual y al tocarlo
// cambia al otro (ES ⇄ EN). Sin dos burbujas separadas: una sola decisión.
// `source` etiqueta desde dónde se usa (landing, header, dashboard…) para poder
// medir en Plausible cuánto se usa el cambio de idioma y si vale la pena.
export default function LanguageSwitcher({ source = 'app' }) {
  const { language, setLanguage } = useI18n();
  const isEs = language === 'es';
  const next = isEs ? 'en' : 'es';
  const label = isEs ? 'Cambiar a inglés' : 'Switch to Spanish';

  function handleClick() {
    if (typeof window.plausible === 'function') {
      window.plausible('lang_switch', { props: { source, from: language, to: next } });
    }
    setLanguage(next);
  }

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      <span className="lang-toggle-flag" aria-hidden="true">{isEs ? '🇪🇸' : '🇺🇸'}</span>
      <span className="lang-toggle-code">{isEs ? 'ES' : 'EN'}</span>
    </button>
  );
}
