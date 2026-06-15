import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { login } from '../services/api';
import InstallPWA from '../components/InstallPWA';
import { useI18n } from '../i18n/I18nProvider';

export default function LoginPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Destino tras login (p. ej. volver a aceptar una invitación de co-tutor).
  const next = searchParams.get('next');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = t('auth.errors.emailRequired');
    if (!form.password) e.password = t('auth.errors.passwordRequired');
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      const { data } = await login(form);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate(next && next.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.errors.loginFailed');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <InstallPWA />
      <h1>{t('auth.welcomeBack')}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">{t('common.password')}</label>
          <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-invalid={!!errors.password} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        {serverError && <p className="server-error">{serverError}</p>}
        <button type="submit" disabled={loading}>{loading ? t('auth.loggingIn') : t('auth.login')}</button>
      </form>
      <p><Link to="/forgot-password">{t('auth.forgotPassword')}</Link></p>
      <p>{t('auth.noAccount')} <Link to="/register">{t('auth.signUp')}</Link></p>
    </div>
  );
}
