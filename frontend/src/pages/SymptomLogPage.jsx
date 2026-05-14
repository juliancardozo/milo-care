import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getSymptoms, createSymptom, deleteSymptom } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function SymptomLogPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getSymptoms(dogId)
      .then(({ data }) => setSymptoms(data.symptoms))
      .catch(() => setError(t('symptoms.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  async function handleAdd(formData) {
    try {
      const { data } = await createSymptom(dogId, formData);
      setSymptoms((prev) => [data, ...prev]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || t('symptoms.errors.add');
    }
  }

  async function handleDelete(symId) {
    if (!window.confirm(t('symptoms.deleteConfirm'))) return;
    try {
      await deleteSymptom(dogId, symId);
      setSymptoms((prev) => prev.filter((s) => s._id !== symId));
    } catch {
      setError(t('symptoms.errors.delete'));
    }
  }

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  const severityLabels = {
    mild: t('symptoms.mild'),
    moderate: t('symptoms.moderate'),
    severe: t('symptoms.severe'),
  };

  return (
    <div className="page">
      <BackLink />
      <header className="page-header">
        <h1>{t('symptoms.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('common.cancel') : t('symptoms.add')}
        </button>
      </header>

      {showForm && <AddSymptomForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {symptoms.length === 0 ? (
        <p>{t('symptoms.none')}</p>
      ) : (
        <ul className="record-list">
          {symptoms.map((s) => (
            <li key={s._id} className={`record-item severity-${s.severity}`}>
              <strong>{s.description}</strong>
              <span className={`badge-severity badge-${s.severity}`}>{severityLabels[s.severity]}</span>
              <span>{new Date(s.dateObserved).toLocaleDateString()}</span>
              {s.notes && <p className="notes">{s.notes}</p>}
              <button onClick={() => handleDelete(s._id)} className="btn-danger-sm">{t('common.delete')}</button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

function AddSymptomForm({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ description: '', severity: 'mild', dateObserved: new Date().toISOString().split('T')[0], notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description || !form.dateObserved) { setError(t('symptoms.requiredError')); return; }
    setError('');
    setLoading(true);
    const err = await onAdd(form);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>{t('symptoms.description')}</label>
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('symptoms.descriptionPlaceholder')} />
      </div>
      <div className="field">
        <label>{t('symptoms.severity')}</label>
        <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="mild">{t('symptoms.mild')}</option>
          <option value="moderate">{t('symptoms.moderate')}</option>
          <option value="severe">{t('symptoms.severe')}</option>
        </select>
      </div>
      <div className="field">
        <label>{t('symptoms.dateObserved')}</label>
        <input type="date" value={form.dateObserved} onChange={(e) => setForm({ ...form, dateObserved: e.target.value })} max={new Date().toISOString().split('T')[0]} />
      </div>
      <div className="field">
        <label>{t('common.notesOptional')}</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? t('vaccinations.saving') : t('common.save')}</button>
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
