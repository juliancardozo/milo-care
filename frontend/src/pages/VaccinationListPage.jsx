import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVaccinations, createVaccination, deleteVaccination, getDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import VaccineCatalogSelect from '../components/VaccineCatalogSelect';
import BackLink from '../components/BackLink';

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
              <h3>
                {v.vaccineName}
                {v.isCalendarRequired && (
                  <span className="badge-senasa-inline" style={{ marginLeft: '8px' }}>⚠ SENASA</span>
                )}
              </h3>
              {v.antigenGroup && <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{v.antigenGroup}</p>}
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
  const [dogCountry, setDogCountry] = useState('AR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      getVaccinations(dogId),
      getDog(dogId),
    ])
      .then(([vacData, dogData]) => {
        setVaccinations(vacData.data.vaccinations);
        setDogCountry(dogData.data.countryProfile || 'AR');
      })
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
      <BackLink />
      <header className="page-header">
        <h1>{t('vaccinations.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('common.cancel') : t('vaccinations.add')}
        </button>
      </header>

      {showForm && <AddVaccinationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} country={dogCountry} t={t} />}
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

    </div>
  );
}

function AddVaccinationForm({ onAdd, onCancel, country, t }) {
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [form, setForm] = useState({ dateAdministered: '', nextDueDate: '', notes: '', lotNumber: '', veterinarian: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleCatalogChange(meta) {
    setCatalogMeta(meta);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!catalogMeta?.vaccineName || !form.dateAdministered) {
      setError('Seleccioná una vacuna y la fecha de aplicación.');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      vaccineName: catalogMeta.vaccineName,
      catalogId: catalogMeta.catalogId,
      isCalendarRequired: catalogMeta.isCalendarRequired,
      antigenGroup: catalogMeta.antigenGroup,
      dateAdministered: form.dateAdministered,
      nextDueDate: form.nextDueDate || undefined,
      notes: form.notes || catalogMeta.notes || '',
      lotNumber: form.lotNumber,
      veterinarian: form.veterinarian,
    };
    const err = await onAdd(payload);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <VaccineCatalogSelect country={country} value={catalogMeta?.vaccineName || ''} onChange={handleCatalogChange} disabled={loading} />

      <div className="field">
        <label htmlFor="vac-date">{t('vaccinations.dateAdministered')}</label>
        <input id="vac-date" type="date" value={form.dateAdministered} onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })} max={new Date().toISOString().split('T')[0]} required />
      </div>
      <div className="field">
        <label htmlFor="vac-next">{t('vaccinations.nextDueOptional')}</label>
        <input id="vac-next" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="vac-vet">Veterinario (opcional)</label>
        <input id="vac-vet" value={form.veterinarian} onChange={(e) => setForm({ ...form, veterinarian: e.target.value })} placeholder="Nombre del veterinario" />
      </div>
      <div className="field">
        <label htmlFor="vac-lot">N° de lote (opcional)</label>
        <input id="vac-lot" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Lote del producto" />
      </div>
      <div className="field">
        <label htmlFor="vac-notes">{t('common.notesOptional')}</label>
        <textarea id="vac-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>

      {error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? t('vaccinations.saving') : t('vaccinations.save')}</button>
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
