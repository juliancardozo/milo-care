import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVaccinations, createVaccination, deleteVaccination } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

const APPLIED_STATUSES = new Set(['completed']);

function isApplied(v) {
  return APPLIED_STATUSES.has(v.status) || v.source === 'manual';
}

const STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  programado: 'Programada',
  pending_vet_validation: 'Pendiente validación veterinaria',
  completed: 'Aplicada',
};

function VaccineSection({ title, items, onDelete, t }) {
  if (items.length === 0) return null;
  return (
    <section className="card">
      <h2>{title} ({items.length})</h2>
      <ul className="record-list">
        {items.map((v) => (
          <li key={v._id} className="record-item">
            <div className="record-info">
              <h3>{v.vaccineName}</h3>
              {v.dateAdministered && (
                <p>{t('vaccinations.administered')}: {new Date(v.dateAdministered).toLocaleDateString('es-AR')}</p>
              )}
              {v.nextDueDate && (
                <p>{t('vaccinations.nextDue')}: {new Date(v.nextDueDate).toLocaleDateString('es-AR')}</p>
              )}
              {v.status && STATUS_LABELS[v.status] && (
                <p>Estado: {STATUS_LABELS[v.status]}</p>
              )}
              {v.notes && <p>{v.notes}</p>}
            </div>
            <div className="record-actions">
              <button onClick={() => onDelete(v._id)} className="btn-danger-sm">{t('common.delete')}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function VaccinationListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getVaccinations(dogId)
      .then(({ data }) => setVaccinations(data.vaccinations))
      .catch(() => setError(t('vaccinations.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  async function handleAdd(formData) {
    try {
      const { data } = await createVaccination(dogId, formData);
      setVaccinations((prev) => [...prev, data]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || t('vaccinations.errors.add');
    }
  }

  async function handleDelete(vacId) {
    if (!window.confirm(t('vaccinations.deleteConfirm'))) return;
    try {
      await deleteVaccination(dogId, vacId);
      setVaccinations((prev) => prev.filter((v) => v._id !== vacId));
    } catch {
      setError(t('vaccinations.errors.delete'));
    }
  }

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  const applied = vaccinations.filter(isApplied);
  const suggested = vaccinations.filter((v) => !isApplied(v));

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('vaccinations.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('common.cancel') : t('vaccinations.add')}
        </button>
      </header>

      {showForm && <AddVaccinationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {vaccinations.length === 0 && <p className="list-empty">{t('vaccinations.noRecords')}</p>}

      <VaccineSection
        title="Vacunas aplicadas"
        items={applied}
        onDelete={handleDelete}
        t={t}
      />

      <VaccineSection
        title="Vacunas sugeridas / próximas"
        items={suggested}
        onDelete={handleDelete}
        t={t}
      />

      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}

function AddVaccinationForm({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ vaccineName: '', dateAdministered: '', nextDueDate: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vaccineName || !form.dateAdministered) { setError(t('vaccinations.requiredError')); return; }
    setError('');
    setLoading(true);
    const err = await onAdd({ ...form, nextDueDate: form.nextDueDate || undefined });
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>{t('vaccinations.vaccineName')}</label>
        <input type="text" value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('vaccinations.dateAdministered')}</label>
        <input type="date" value={form.dateAdministered} onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })} max={new Date().toISOString().split('T')[0]} />
      </div>
      <div className="field">
        <label>{t('vaccinations.nextDueOptional')}</label>
        <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('common.notesOptional')}</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? t('vaccinations.saving') : t('vaccinations.save')}</button>
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
