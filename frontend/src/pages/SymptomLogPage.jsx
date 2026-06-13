import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getDog, getSymptoms, createSymptom, deleteSymptom } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/health-records.css';

export default function SymptomLogPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [symptoms, setSymptoms] = useState([]);
  const [dogName, setDogName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getDog(dogId).then(({ data }) => setDogName(data?.name || '')).catch(() => {});
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

  if (loading) return <div className="hr-page"><p>{t('common.loading')}</p></div>;

  const name = dogName || t('explore.yourDog');
  const severityLabels = {
    mild: t('symptoms.mild'),
    moderate: t('symptoms.moderate'),
    severe: t('symptoms.severe'),
  };

  return (
    <div className="hr-page">
      <BackLink />

      <section className="hr-hero sym">
        <span className="hr-hero-emoji" aria-hidden="true">🩺</span>
        <h1>{t('symptoms.heroTitle', { dog: name })}</h1>
        <p>{t('symptoms.heroSub')}</p>
        {symptoms.length > 0 && (
          <span className="hr-hero-meta">{t('symptoms.entries', { n: symptoms.length })}</span>
        )}
      </section>

      <div className="hr-toolbar">
        <button onClick={() => setShowForm(!showForm)} className={`hr-add ${showForm ? 'is-cancel' : ''}`}>
          {showForm ? t('common.cancel') : t('symptoms.add')}
        </button>
      </div>

      {showForm && <AddSymptomForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {symptoms.length === 0 ? (
        <div className="hr-empty">
          <div className="hr-empty-emoji" aria-hidden="true">🌿</div>
          <h2>{t('symptoms.emptyTitle', { dog: name })}</h2>
          <p>{t('symptoms.emptySub')}</p>
        </div>
      ) : (
        <ul className="hr-list">
          {symptoms.map((s) => (
            <li key={s._id} className={`hr-card sev-${s.severity}`}>
              <div className="hr-card-head">
                <span className="hr-card-title">{s.description}</span>
                <span className={`hr-badge sev-${s.severity}`}>{severityLabels[s.severity]}</span>
              </div>
              <div className="hr-meta">
                <span className="hr-chip">
                  <span className="hr-chip-ico" aria-hidden="true">📅</span>
                  {t('symptoms.observedOn', { date: new Date(s.dateObserved).toLocaleDateString() })}
                </span>
                {s.isQuickLog && (
                  <span className="hr-chip quick">
                    <span className="hr-chip-ico" aria-hidden="true">⚡</span>
                    {t('symptoms.quickLog')}
                  </span>
                )}
              </div>
              {s.notes && <p className="hr-notes">{s.notes}</p>}
              <div className="hr-card-actions">
                <button onClick={() => handleDelete(s._id)} className="hr-action danger">{t('common.delete')}</button>
              </div>
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
