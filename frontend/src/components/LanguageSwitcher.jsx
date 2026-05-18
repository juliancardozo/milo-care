import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="language-switcher" aria-label="Language switcher">
      <Link to="/" className="language-flag language-flag-home" aria-label="Volver al inicio" title="Inicio">
        ←
      </Link>
      <button
        type="button"
        className={`language-flag ${language === 'es' ? 'active' : ''}`}
        onClick={() => setLanguage('es')}
        aria-label="Cambiar a Espanol"
        title="Espanol"
      >
        🇪🇸
      </button>
      <button
        type="button"
        className={`language-flag ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-label="Switch to English"
        title="English"
      >
        🇺🇸
      </button>
    </div>
  );
}