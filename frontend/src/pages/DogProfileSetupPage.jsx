import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDog } from '../services/api';

export default function DogProfileSetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', breed: '', dateOfBirth: '', photoUrl: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Dog name is required.';
    if (!form.breed.trim()) e.breed = 'Breed is required.';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required.';
    else if (new Date(form.dateOfBirth) > new Date()) e.dateOfBirth = 'Date of birth must be in the past.';
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
      const msg = err.response?.data?.message || 'Failed to create dog profile.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Set up your dog's profile</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="dogName">Dog's name</label>
          <input id="dogName" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="breed">Breed</label>
          <input id="breed" type="text" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} aria-invalid={!!errors.breed} />
          {errors.breed && <span className="field-error">{errors.breed}</span>}
        </div>
        <div className="field">
          <label htmlFor="dob">Date of birth</label>
          <input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} max={new Date().toISOString().split('T')[0]} aria-invalid={!!errors.dateOfBirth} />
          {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
        </div>
        <div className="field">
          <label htmlFor="photoUrl">Photo URL (optional)</label>
          <input id="photoUrl" type="url" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://…" />
        </div>
        {serverError && <p className="server-error">{serverError}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save profile'}</button>
      </form>
    </div>
  );
}
