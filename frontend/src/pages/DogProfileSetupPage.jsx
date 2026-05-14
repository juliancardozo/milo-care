import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function DogProfileSetupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', breed: '', dateOfBirth: '', photoUrl: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = t('dogs.errors.dogNameRequired');
    if (!form.breed.trim()) e.breed = t('dogs.errors.breedRequired');
    if (!form.dateOfBirth) e.dateOfBirth = t('dogs.errors.dobRequired');
    else if (new Date(form.dateOfBirth) > new Date()) e.dateOfBirth = t('dogs.errors.dobPast');
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
      await createDog({ ...form, photoUrl: form.photoUrl || undefined });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || t('dogs.errors.create');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>{t('dogs.setupTitle')}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="dogName">{t('dogs.dogName')}</label>
          <input id="dogName" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="breed">{t('dogs.breed')}</label>
          <input id="breed" type="text" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} aria-invalid={!!errors.breed} />
          {errors.breed && <span className="field-error">{errors.breed}</span>}
        </div>
        <div className="field">
          <label htmlFor="dob">{t('dogs.dob')}</label>
          <input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} max={new Date().toISOString().split('T')[0]} aria-invalid={!!errors.dateOfBirth} />
          {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
        </div>
        <div className="field">
          <label htmlFor="photoUrl">{t('dogs.photoUrlOptional')}</label>
          <input id="photoUrl" type="url" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder={t('dogs.photoUrlPlaceholder')} />
        </div>
        {serverError && <p className="server-error">{serverError}</p>}
        <button type="submit" disabled={loading}>{loading ? t('dogs.saving') : t('dogs.saveProfile')}</button>
      </form>
    </div>
  );
}
