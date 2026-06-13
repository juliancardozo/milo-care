import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getDog, getMedications, createMedication, updateMedication, deleteMedication } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/health-records.css';

export default function MedicationListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [medications, setMedications] = useState([]);
  const [dogName, setDogName] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getDog(dogId).then(({ data }) => setDogName(data?.name || '')).catch(() => {});
  }, [dogId]);

  useEffect(() => {
    getMedications(dogId, showInactive ? {} : { active: 'true' })
      .then(({ data }) => setMedications(data.medications))
      .catch(() => setError(t('medications.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, showInactive, t]);

  async function handleAdd(formData) {
    try {
      const { data } = await createMedication(dogId, formData);
      setMedications((prev) => [...prev, data]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || t('medications.errors.add');
    }
  }

  async function handleMarkInactive(medId) {
    try {
      const { data } = await updateMedication(dogId, medId, { isActive: false });
      setMedications((prev) => prev.map((m) => (m._id === medId ? data : m)));
    } catch {
      setError(t('medications.errors.update'));
    }
  }

  async function handleDelete(medId) {
    if (!window.confirm(t('medications.deleteConfirm'))) return;
    try {
      await deleteMedication(dogId, medId);
      setMedications((prev) => prev.filter((m) => m._id !== medId));
    } catch {
      setError(t('medications.errors.delete'));
    }
  }

  if (loading) return <div className="hr-page"><p>{t('common.loading')}</p></div>;

  const name = dogName || t('explore.yourDog');
  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);

  const renderCard = (m) => (
    <li key={m._id} className={`hr-card ${m.isActive ? 'med-active' : 'is-inactive'}`}>
      <div className="hr-card-head">
        <span className="hr-card-title">💊 {m.medicationName}</span>
        {!m.isActive && <span className="hr-badge inactive">{t('medications.inactive')}</span>}
      </div>
      <div className="hr-meta">
        <span className="hr-chip"><span className="hr-chip-ico" aria-hidden="true">⚖️</span>{m.dosage}</span>
        {m.oneTime ? (
          <span className="hr-chip"><span className="hr-chip-ico" aria-hidden="true">1️⃣</span>{t('medications.oneTime')}</span>
        ) : (
          <span className="hr-chip"><span className="hr-chip-ico" aria-hidden="true">⏱️</span>{t('medications.every', { hours: m.frequencyHours })}</span>
        )}
        <span className="hr-chip"><span className="hr-chip-ico" aria-hidden="true">▶️</span>{t('medications.started')}: {new Date(m.startDate).toLocaleDateString()}</span>
        {!m.oneTime && m.endDate && <span className="hr-chip"><span className="hr-chip-ico" aria-hidden="true">🏁</span>{t('medications.until')}: {new Date(m.endDate).toLocaleDateString()}</span>}
      </div>
      {m.notes && <p className="hr-notes">{m.notes}</p>}
      <div className="hr-card-actions">
        {m.isActive && <button onClick={() => handleMarkInactive(m._id)} className="hr-action">{t('medications.markComplete')}</button>}
        <button onClick={() => handleDelete(m._id)} className="hr-action danger">{t('common.delete')}</button>
      </div>
    </li>
  );

  return (
    <div className="hr-page">
      <BackLink />

      <section className="hr-hero med">
        <span className="hr-hero-emoji" aria-hidden="true">💊</span>
        <h1>{t('medications.heroTitle', { dog: name })}</h1>
        <p>{t('medications.heroSub')}</p>
        {activeMeds.length > 0 && (
          <span className="hr-hero-meta">{activeMeds.length} · {t('medications.activeSection')}</span>
        )}
      </section>

      <div className="hr-toolbar">
        <button onClick={() => setShowForm(!showForm)} className={`hr-add ${showForm ? 'is-cancel' : ''}`}>
          {showForm ? t('common.cancel') : t('medications.add')}
        </button>
        <label className="hr-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          {t('medications.showInactive')}
        </label>
      </div>

      {showForm && <AddMedicationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {medications.length === 0 ? (
        <div className="hr-empty">
          <div className="hr-empty-emoji" aria-hidden="true">🐾</div>
          <h2>{t('medications.emptyTitle', { dog: name })}</h2>
          <p>{t('medications.emptySub')}</p>
        </div>
      ) : (
        <>
          {activeMeds.length > 0 && (
            <>
              <p className="hr-section-label">{t('medications.activeSection')}</p>
              <ul className="hr-list">{activeMeds.map(renderCard)}</ul>
            </>
          )}
          {inactiveMeds.length > 0 && (
            <>
              <p className="hr-section-label">{t('medications.inactiveSection')}</p>
              <ul className="hr-list">{inactiveMeds.map(renderCard)}</ul>
            </>
          )}
        </>
      )}

    </div>
  );
}

function AddMedicationForm({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ medicationName: '', dosage: '', frequencyHours: '', startDate: '', endDate: '', notes: '' });
  const [oneTime, setOneTime] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    // La frecuencia solo es obligatoria para tratamientos recurrentes.
    if (!form.medicationName || !form.dosage || !form.startDate || (!oneTime && !form.frequencyHours)) {
      setError(t('medications.requiredError'));
      return;
    }
    setError('');
    setLoading(true);
    const payload = oneTime
      ? { medicationName: form.medicationName, dosage: form.dosage, startDate: form.startDate, notes: form.notes, oneTime: true }
      : { ...form, endDate: form.endDate || undefined, frequencyHours: Number(form.frequencyHours), oneTime: false };
    const err = await onAdd(payload);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>{t('medications.medicationName')}</label>
        <input type="text" value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('medications.dosage')}</label>
        <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder={t('medications.dosagePlaceholder')} />
      </div>

      <label className="med-onetime">
        <input type="checkbox" checked={oneTime} onChange={(e) => setOneTime(e.target.checked)} />
        <span>
          <strong>{t('medications.oneTime')}</strong>
          <small>{t('medications.oneTimeHelp')}</small>
        </span>
      </label>

      <div className="field">
        <label>{t('medications.startDate')}</label>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>

      {!oneTime && (
        <>
          <div className="field">
            <label>{t('medications.frequencyHours')}</label>
            <input type="number" min="1" value={form.frequencyHours} onChange={(e) => setForm({ ...form, frequencyHours: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('medications.endDateOptional')}</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </>
      )}

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
