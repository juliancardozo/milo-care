import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { vetPortalRegister } from '../../services/clinicApi';
import { useI18n } from '../../i18n/I18nProvider';
import '../../styles/vet-panel.css';

const BRAND_SVG = (
  <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor" opacity=".9" />
  </svg>
);

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

  const happens = t('vetRegister.happens');
  const benefits = t('vetRegister.benefits');

  return (
    <div className="vr-page">
      <Link to="/para-veterinarias" className="vr-brand">{BRAND_SVG}<span>Milo Care</span></Link>

      <div className="vr-layout">
        {/* Panel de valor: qué está por pasar + por qué conviene */}
        <aside className="vr-aside">
          <span className="vr-eyebrow">{t('vetRegister.eyebrow')}</span>
          <h1 className="vr-title">{t('vetRegister.valueTitle')}</h1>
          <p className="vr-lead">{t('vetRegister.valueSub')}</p>

          <div className="vr-happens">
            <h2>{t('vetRegister.happensTitle')}</h2>
            <ol>
              {happens.map((s, i) => (
                <li key={i}><span className="vr-step-n" aria-hidden="true">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </div>

          <ul className="vr-benefits">
            {benefits.map((b) => (
              <li key={b.t}><span className="vr-benefit-icon" aria-hidden="true">{b.icon}</span>{b.t}</li>
            ))}
          </ul>

          <p className="vr-reassure">✓ {t('vetRegister.reassure')}</p>
        </aside>

        {/* Formulario */}
        <div className="vr-form-card">
          <h2 className="vr-form-title">{t('vetRegister.formTitle')}</h2>
          <p className="vr-form-hint">{t('vetRegister.formHint')}</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="vr-field">
              <label htmlFor="clinicName">{t('vetRegister.clinicName')} <span className="vr-req" aria-hidden="true">*</span></label>
              <input id="clinicName" value={form.clinicName} onChange={set('clinicName')} required autoComplete="organization" />
            </div>

            <div className="vr-row">
              <div className="vr-field">
                <label htmlFor="name">{t('vetRegister.yourName')} <span className="vr-req" aria-hidden="true">*</span></label>
                <input id="name" value={form.name} onChange={set('name')} required autoComplete="name" />
              </div>
              <div className="vr-field">
                <label htmlFor="country">{t('vetRegister.country')}</label>
                <select id="country" value={form.country} onChange={set('country')}>
                  <option value="AR">{t('vetRegister.countryAR')}</option>
                  <option value="UY">{t('vetRegister.countryUY')}</option>
                </select>
              </div>
            </div>

            <div className="vr-field">
              <label htmlFor="email">{t('common.email')} <span className="vr-req" aria-hidden="true">*</span></label>
              <input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>

            <div className="vr-field">
              <label htmlFor="password">{t('common.password')} <span className="vr-req" aria-hidden="true">*</span></label>
              <input id="password" type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
              <span className="vr-field-hint">{t('vetRegister.passwordHint')}</span>
            </div>

            <div className="vr-row">
              <div className="vr-field">
                <label htmlFor="city">{t('vetRegister.city')}</label>
                <input id="city" value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </div>
              <div className="vr-field">
                <label htmlFor="whatsapp">{t('vetRegister.whatsapp')} <span className="vr-opt">· {t('vetRegister.optional')}</span></label>
                <input id="whatsapp" value={form.whatsapp} onChange={set('whatsapp')} inputMode="tel" autoComplete="tel" />
                <span className="vr-field-hint">{t('vetRegister.whatsappHint')}</span>
              </div>
            </div>

            {serverError && <p className="vr-server-error" role="alert">{serverError}</p>}

            <button type="submit" className="vr-submit" disabled={loading}>
              {loading ? t('vetRegister.creating') : t('vetRegister.submit')}
            </button>
            <p className="vr-after">{t('vetRegister.afterNote')}</p>
            <p className="vr-login-alt">{t('vetRegister.haveAccount')} <Link to="/login">{t('vetRegister.login')}</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}
