import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { register } from '../services/api';
import { getStoredRef, clearStoredRef } from '../services/referralApi';
import { useI18n } from '../i18n/I18nProvider';

export default function RegisterPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = t('auth.errors.nameRequired');
    if (!form.email.trim()) e.email = t('auth.errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.errors.validEmail');
    if (!form.password) e.password = t('auth.errors.passwordRequired');
    else if (form.password.length < 8) e.password = t('auth.errors.passwordMin');
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
      const referralCode = getStoredRef();
      const { data } = await register(referralCode ? { ...form, referralCode } : form);
      clearStoredRef();
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate('/dogs/new');
    } catch (err) {
      const msg = err.response?.data?.message || t('auth.errors.registerFailed');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  const invitedBy = getStoredRef();

  return (
    <div className="auth-page">
      <h1>{t('auth.createAccountTitle')}</h1>
      {invitedBy && (
        <p className="referral-invite-note">{t('referrals.invitedBanner', { code: invitedBy })}</p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">{t('common.name')}</label>
          <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
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
        <button type="submit" disabled={loading}>{loading ? t('auth.creatingAccount') : t('auth.createAccount')}</button>
      </form>
      <p>{t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.login')}</Link></p>
    </div>
  );
}
