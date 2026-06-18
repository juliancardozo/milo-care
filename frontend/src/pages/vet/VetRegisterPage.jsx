import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { vetPortalRegister } from '../../services/clinicApi';
import { useI18n } from '../../i18n/I18nProvider';
import '../../styles/vet-panel.css';

// Autoservicio del vet (secundario en el piloto; el alta principal la hace el admin).
export default function VetRegisterPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', clinicName: '', city: '', whatsapp: '', country: 'AR' });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setLoading(true);
    try {
      const { data } = await vetPortalRegister(form);
      dispatch(setCredentials({ user: { ...data.user, role: 'vet' }, token: data.token }));
      navigate('/vet-portal');
    } catch (err) {
      setServerError(err.response?.data?.message || t('vetRegister.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page vr-page">
      <h1>{t('vetRegister.title')}</h1>
      <p className="vr-sub">{t('vetRegister.subtitle')}</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="clinicName">{t('vetRegister.clinicName')}</label>
          <input id="clinicName" value={form.clinicName} onChange={set('clinicName')} />
        </div>
        <div className="field">
          <label htmlFor="name">{t('vetRegister.yourName')}</label>
          <input id="name" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label htmlFor="password">{t('common.password')}</label>
          <input id="password" type="password" value={form.password} onChange={set('password')} />
        </div>
        <div className="field">
          <label htmlFor="city">{t('vetRegister.city')}</label>
          <input id="city" value={form.city} onChange={set('city')} />
        </div>
        <div className="field">
          <label htmlFor="whatsapp">{t('vetRegister.whatsapp')}</label>
          <input id="whatsapp" value={form.whatsapp} onChange={set('whatsapp')} />
        </div>
        {serverError && <p className="server-error">{serverError}</p>}
        <button type="submit" disabled={loading}>{loading ? t('vetRegister.creating') : t('vetRegister.submit')}</button>
      </form>
    </div>
  );
}
