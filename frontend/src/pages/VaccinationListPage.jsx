import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVaccinations, createVaccination, deleteVaccination, getDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import VaccineCatalogSelect from '../components/VaccineCatalogSelect';
import BackLink from '../components/BackLink';
import '../styles/vaccinations.css';

const APPLIED_STATUSES = new Set(['completed']);
function isApplied(v) { return APPLIED_STATUSES.has(v.status) || v.source === 'manual'; }

const STATUS_LABELS = {
  suggested: 'Sugerida', upcoming: 'Próxima', programado: 'Programada',
  pending_vet_validation: 'Pendiente de validación', completed: 'Aplicada',
};

function fmt(d) { return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }); }
function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }

function pendingBadge(v) {
  const status = String(v.status || '').toLowerCase();
  if (status === 'pending_vet_validation') return { label: 'Pendiente de validación', tone: 'amber' };
  if (v.nextDueDate) {
    const d = daysUntil(v.nextDueDate);
    if (d < 0) return { label: `Venció hace ${Math.abs(d)} d`, tone: 'red' };
    if (d === 0) return { label: 'Vence hoy', tone: 'red' };
    if (d <= 14) return { label: `Vence en ${d} d`, tone: 'amber' };
    return { label: 'Próxima', tone: 'blue' };
  }
  if (status === 'suggested') return { label: 'Sugerida', tone: 'gray' };
  return { label: STATUS_LABELS[status] || 'Programada', tone: 'blue' };
}

function VaccineCard({ v, applied, onDelete, t }) {
  const badge = applied ? { label: 'Aplicada', tone: 'green' } : pendingBadge(v);
  const overdue = badge.tone === 'red';
  const iconClass = applied ? 'applied' : overdue ? 'overdue' : '';
  return (
    <article className="vac-card">
      <span className={`vac-icon ${iconClass}`}>{applied ? '✅' : '💉'}</span>
      <div className="vac-body">
        <div className="vac-name-row">
          <span className="vac-name">{v.vaccineName}</span>
          {v.isCalendarRequired && <span className="vac-senasa">⚠ SENASA</span>}
        </div>
        {v.antigenGroup && <p className="vac-antigen">{v.antigenGroup}</p>}

        <div className="vac-meta">
          <span className={`vac-badge ${badge.tone}`}>{badge.label}</span>
          {applied && v.dateAdministered && <span className="vac-date">💉 {t('vaccinations.administered')}: {fmt(v.dateAdministered)}</span>}
          {!applied && v.nextDueDate && <span className="vac-date">📅 {fmt(v.nextDueDate)}</span>}
          {applied && v.nextDueDate && <span className="vac-date">↻ Próxima: {fmt(v.nextDueDate)}</span>}
        </div>

        {v.notes && <p className="vac-notes">{v.notes}</p>}
      </div>
      <button className="vac-del" onClick={() => onDelete(v._id)} aria-label={t('common.delete')}>🗑</button>
    </article>
  );
}

export default function VaccinationListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [vaccinations, setVaccinations] = useState([]);
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([getVaccinations(dogId), getDog(dogId)])
      .then(([vacData, dogData]) => {
        setVaccinations(vacData.data.vaccinations);
        setDog(dogData.data);
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
  const pending = vaccinations.filter((v) => !isApplied(v))
    .sort((a, b) => new Date(a.nextDueDate || 0) - new Date(b.nextDueDate || 0));
  const name = dog?.name || '';

  return (
    <div className="vac-page">
      <BackLink />

      <div className="vac-hero">
        {dog?.photoUrl
          ? <img className="vac-hero-avatar" src={dog.photoUrl} alt={name} />
          : <span className="vac-hero-ph" style={{ background: 'linear-gradient(135deg,#dbeafe,#d1fae5)' }}>💉</span>}
        <div>
          <h1>{t('vaccinations.title')}{name ? ` · ${name}` : ''}</h1>
          <p>El carnet de tu perro, siempre a mano 🐾</p>
        </div>
        <div className="vac-hero-spacer" />
        <button onClick={() => setShowForm(!showForm)} className={`vac-add ${showForm ? 'cancel' : ''}`}>
          {showForm ? t('common.cancel') : `＋ ${t('vaccinations.add')}`}
        </button>
      </div>

      {showForm && <AddVaccinationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} country={dog?.countryProfile || 'AR'} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {vaccinations.length === 0 && (
        <div className="vac-empty">
          <div className="vac-empty-emoji">💉</div>
          <p>{t('vaccinations.noRecords')}</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="vac-section">
          <h2 className="vac-section-title">Próximas y pendientes <span className="vac-count">{pending.length}</span></h2>
          {pending.map((v) => <VaccineCard key={v._id} v={v} applied={false} onDelete={handleDelete} t={t} />)}
        </section>
      )}

      {applied.length > 0 && (
        <section className="vac-section">
          <h2 className="vac-section-title">Aplicadas <span className="vac-count">{applied.length}</span></h2>
          {applied.map((v) => <VaccineCard key={v._id} v={v} applied onDelete={handleDelete} t={t} />)}
        </section>
      )}
    </div>
  );
}

function AddVaccinationForm({ onAdd, onCancel, country, t }) {
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [form, setForm] = useState({ dateAdministered: '', nextDueDate: '', notes: '', lotNumber: '', veterinarian: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!catalogMeta?.vaccineName || !form.dateAdministered) {
      setError('Seleccioná una vacuna y la fecha de aplicación.');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      vaccineName: catalogMeta.vaccineName, catalogId: catalogMeta.catalogId,
      isCalendarRequired: catalogMeta.isCalendarRequired, antigenGroup: catalogMeta.antigenGroup,
      dateAdministered: form.dateAdministered, nextDueDate: form.nextDueDate || undefined,
      notes: form.notes || catalogMeta.notes || '', lotNumber: form.lotNumber, veterinarian: form.veterinarian,
    };
    const err = await onAdd(payload);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="vac-form">
      <h2>💉 Registrar una vacuna</h2>
      <VaccineCatalogSelect country={country} value={catalogMeta?.vaccineName || ''} onChange={setCatalogMeta} disabled={loading} />

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
        <button type="submit" className="vac-form-save" disabled={loading}>{loading ? t('vaccinations.saving') : t('vaccinations.save')}</button>
        <button type="button" className="vac-form-cancel" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
