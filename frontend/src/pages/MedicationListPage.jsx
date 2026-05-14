import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMedications, createMedication, updateMedication, deleteMedication } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function MedicationListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [medications, setMedications] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('medications.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('common.cancel') : t('medications.add')}
        </button>
      </header>

      {showForm && <AddMedicationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      <label className="toggle-label">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        {t('medications.showInactive')}
      </label>

      {medications.length === 0 ? (
        <p>{t('medications.noRecords', { suffix: showInactive ? '' : t('medications.activeSuffix') })}</p>
      ) : (
        <ul className="record-list">
          {medications.map((m) => (
            <li key={m._id} className={`record-item ${!m.isActive ? 'inactive' : ''}`}>
              <strong>{m.medicationName}</strong>
              <span>{m.dosage} · {t('medications.everyHours', { hours: m.frequencyHours })}</span>
              <span>{t('medications.started')}: {new Date(m.startDate).toLocaleDateString()}</span>
              {m.endDate && <span>{t('medications.until')}: {new Date(m.endDate).toLocaleDateString()}</span>}
              {!m.isActive && <span className="badge-inactive">{t('medications.inactive')}</span>}
              {m.notes && <p className="notes">{m.notes}</p>}
              <div className="record-actions">
                {m.isActive && <button onClick={() => handleMarkInactive(m._id)} className="btn-secondary-sm">{t('medications.markComplete')}</button>}
                <button onClick={() => handleDelete(m._id)} className="btn-danger-sm">{t('common.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}

function AddMedicationForm({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ medicationName: '', dosage: '', frequencyHours: '', startDate: '', endDate: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.medicationName || !form.dosage || !form.frequencyHours || !form.startDate) {
      setError(t('medications.requiredError'));
      return;
    }
    setError('');
    setLoading(true);
    const err = await onAdd({ ...form, endDate: form.endDate || undefined, frequencyHours: Number(form.frequencyHours) });
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
      <div className="field">
        <label>{t('medications.frequencyHours')}</label>
        <input type="number" min="1" value={form.frequencyHours} onChange={(e) => setForm({ ...form, frequencyHours: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('medications.startDate')}</label>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('medications.endDateOptional')}</label>
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
