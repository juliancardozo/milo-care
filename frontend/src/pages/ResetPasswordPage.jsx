import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const userId = searchParams.get('userId') || '';

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) { setError(t('auth.errors.passwordMin')); return; }
    if (!token || !userId) { setError(t('auth.errors.invalidResetLink')); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword({ token, userId, newPassword });
      navigate('/login?reset=success');
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.errors.resetFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.setNewPassword')}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="newPassword">{t('auth.newPassword')}</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} aria-invalid={!!error} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" disabled={loading}>{loading ? t('auth.updating') : t('auth.setNewPassword')}</button>
      </form>
      <p><Link to="/forgot-password">{t('auth.requestNewLink')}</Link></p>
    </div>
  );
}
