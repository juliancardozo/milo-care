import { useI18n } from '../i18n/I18nProvider';

// Toggle de idioma de una sola acción: muestra el idioma actual y al tocarlo
// cambia al otro (ES ⇄ EN). Sin dos burbujas separadas: una sola decisión.
export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const isEs = language === 'es';
  const next = isEs ? 'en' : 'es';
  const label = isEs ? 'Cambiar a inglés' : 'Switch to Spanish';

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLanguage(next)}
      aria-label={label}
      title={label}
    >
      <span className="lang-toggle-flag" aria-hidden="true">{isEs ? '🇪🇸' : '🇺🇸'}</span>
      <span className="lang-toggle-code">{isEs ? 'ES' : 'EN'}</span>
    </button>
  );
}
