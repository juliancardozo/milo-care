import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestMagicLink } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

// "Fast forward": pedir un link de ingreso sin contraseña al correo.
export default function MagicLinkPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError(t('auth.errors.emailRequired')); return; }
    setError('');
    setLoading(true);
    try {
      await requestMagicLink(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <h1>{t('auth.checkEmail')}</h1>
        <p>{t('auth.magicSuccess')}</p>
        <Link to="/login">{t('auth.backToLogin')}</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.magicTitle')}</h1>
      <p>{t('auth.magicIntro')}</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" disabled={loading}>{loading ? t('auth.sending') : t('auth.sendMagicLink')}</button>
      </form>
      <p><Link to="/login">{t('auth.backToLogin')}</Link></p>
    </div>
  );
}
