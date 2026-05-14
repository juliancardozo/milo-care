import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function ForgotPasswordPage() {
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
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.errors.generic');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <h1>{t('auth.checkEmail')}</h1>
        <p>{t('auth.resetSuccess')}</p>
        <Link to="/login">{t('auth.backToLogin')}</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.resetPassword')}</h1>
      <p>{t('auth.resetIntro')}</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" disabled={loading}>{loading ? t('auth.sending') : t('auth.sendResetLink')}</button>
      </form>
      <p><Link to="/login">{t('auth.backToLogin')}</Link></p>
    </div>
  );
}
