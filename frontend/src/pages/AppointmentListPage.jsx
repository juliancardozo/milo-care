import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import AppointmentCatalogSelect from '../components/AppointmentCatalogSelect';

const now = new Date();

function isUpcoming(a) {
  return !a.isCancelled && new Date(a.appointmentDate) >= now;
}

function AppointmentCard({ a, onCancel, onDelete, t }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(a.appointmentDate).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <li className={`record-item ${a.isCancelled ? 'opacity-50' : ''}`}>
      <div className="record-info">
        <h3>
          {a.title}
          {a.isWsavaRecommended && !a.urgency && (
            <span className="badge-wsava-inline" style={{ marginLeft: '8px' }}>✓ WSAVA</span>
          )}
          {a.urgency && (
            <span className="badge-urgency-inline" style={{ marginLeft: '8px' }}>🚨 Urgencia</span>
          )}
          {a.isCancelled && (
            <span className="badge badge-cancelled" style={{ marginLeft: '8px' }}>{t('appointments.cancelled')}</span>
          )}
        </h3>
        <p>{dateStr}</p>
        {a.vetName && <p>{t('appointments.vet')}: {a.vetName}</p>}
        {a.clinicName && <p>Clínica: {a.clinicName}</p>}
        {a.location && <p>{t('appointments.location')}: {a.location}</p>}
        {a.notes && <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{a.notes}</p>}

        {a.checklist?.length > 0 && (
          <details open={expanded} onToggle={(e) => setExpanded(e.target.open)} style={{ marginTop: '6px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 500 }}>
              Checklist ({a.checklist.length} ítems)
            </summary>
            <ul style={{ marginTop: '4px', paddingLeft: '16px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {a.checklist.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </details>
        )}
      </div>

      {!a.isCancelled && (
        <div className="record-actions">
          <button onClick={() => onCancel(a._id)} className="btn-secondary-sm">{t('appointments.cancelAppointment')}</button>
          <button onClick={() => onDelete(a._id)} className="btn-danger-sm">{t('common.delete')}</button>
        </div>
      )}
      {a.isCancelled && (
        <div className="record-actions">
          <button onClick={() => onDelete(a._id)} className="btn-danger-sm">{t('common.delete')}</button>
        </div>
      )}
    </li>
  );
}

function AppointmentSection({ title, items, onCancel, onDelete, t, emptyText }) {
  return (
    <section className="card">
      <h2>{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="list-empty">{emptyText}</p>
      ) : (
        <ul className="record-list">
          {items.map((a) => (
            <AppointmentCard key={a._id} a={a} onCancel={onCancel} onDelete={onDelete} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AppointmentListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getAppointments(dogId)
      .then(({ data }) => setAppointments(data.appointments))
      .catch(() => setError(t('appointments.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  async function handleAdd(formData) {
    try {
      const { data } = await createAppointment(dogId, formData);
      setAppointments((prev) =>
        [...prev, data].sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
      );
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || t('appointments.errors.add');
    }
  }

  async function handleCancel(apptId) {
    if (!window.confirm(t('appointments.cancelConfirm'))) return;
    try {
      const { data } = await updateAppointment(dogId, apptId, { isCancelled: true });
      setAppointments((prev) => prev.map((a) => (a._id === apptId ? data : a)));
    } catch {
      setError(t('appointments.errors.cancel'));
    }
  }

  async function handleDelete(apptId) {
    if (!window.confirm(t('appointments.deleteConfirm'))) return;
    try {
      await deleteAppointment(dogId, apptId);
      setAppointments((prev) => prev.filter((a) => a._id !== apptId));
    } catch {
      setError(t('appointments.errors.delete'));
    }
  }

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  const upcoming = appointments.filter(isUpcoming);
  const past = appointments.filter((a) => !isUpcoming(a));

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('appointments.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('common.cancel') : t('appointments.add')}
        </button>
      </header>

      {showForm && <AddAppointmentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      <AppointmentSection
        title="Próximas"
        items={upcoming}
        onCancel={handleCancel}
        onDelete={handleDelete}
        t={t}
        emptyText="Sin citas próximas programadas."
      />

      <AppointmentSection
        title="Pasadas / canceladas"
        items={past}
        onCancel={handleCancel}
        onDelete={handleDelete}
        t={t}
        emptyText="Sin historial de citas."
      />

      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}

function AddAppointmentForm({ onAdd, onCancel, t }) {
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [form, setForm] = useState({
    appointmentDate: '',
    vetName: '',
    clinicName: '',
    location: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!catalogMeta?.title || !form.appointmentDate) {
      setError('Seleccioná el tipo de cita y la fecha.');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      title: catalogMeta.title,
      catalogId: catalogMeta.catalogId,
      isWsavaRecommended: catalogMeta.isWsavaRecommended,
      appointmentType: catalogMeta.appointmentType,
      checklist: catalogMeta.checklist || [],
      appointmentDate: form.appointmentDate,
      vetName: form.vetName,
      clinicName: form.clinicName,
      location: form.location,
      notes: form.notes || catalogMeta.notes || '',
    };
    const err = await onAdd(payload);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <AppointmentCatalogSelect value={catalogMeta?.title || ''} onChange={setCatalogMeta} disabled={loading} />

      <div className="field">
        <label htmlFor="appt-date">{t('appointments.dateTime')}</label>
        <input id="appt-date" type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} required />
      </div>
      <div className="field">
        <label htmlFor="appt-vet">{t('appointments.vetOptional')}</label>
        <input id="appt-vet" value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })} placeholder="Nombre del veterinario" />
      </div>
      <div className="field">
        <label htmlFor="appt-clinic">Clínica / consultorio (opcional)</label>
        <input id="appt-clinic" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} placeholder="Nombre de la clínica" />
      </div>
      <div className="field">
        <label htmlFor="appt-location">{t('appointments.locationOptional')}</label>
        <input id="appt-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="appt-notes">{t('common.notesOptional')}</label>
        <textarea id="appt-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>

      {error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? t('vaccinations.saving') : t('common.save')}</button>
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
