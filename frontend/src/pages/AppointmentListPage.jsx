import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import AppointmentCatalogSelect from '../components/AppointmentCatalogSelect';
import BackLink from '../components/BackLink';
import '../styles/appointments.css';

const now = new Date();
function isUpcoming(a) { return !a.isCancelled && new Date(a.appointmentDate) >= now; }

function countdown(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ad = new Date(dateStr); ad.setHours(0, 0, 0, 0);
  const days = Math.round((ad - today) / 86400000);
  if (days < 0) return { label: `Hace ${Math.abs(days)} d`, tone: 'gray' };
  if (days === 0) return { label: 'Hoy', tone: 'red' };
  if (days === 1) return { label: 'Mañana', tone: 'amber' };
  if (days < 7) return { label: `En ${days} días`, tone: 'amber' };
  if (days < 14) return { label: 'En 1 semana', tone: 'blue' };
  if (days < 31) return { label: `En ${Math.round(days / 7)} semanas`, tone: 'blue' };
  return { label: `En ${Math.round(days / 30)} meses`, tone: 'blue' };
}

function AppointmentCard({ a, onCancel, onDelete, t }) {
  const date = new Date(a.appointmentDate);
  const month = date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  const day = date.getDate();
  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const cd = a.isCancelled ? null : countdown(a.appointmentDate);
  const tone = a.isCancelled ? 'gray' : (cd?.tone || 'blue');

  return (
    <article className={`appt-card ${a.isCancelled ? 'cancelled' : ''}`}>
      <div className={`appt-tile ${tone}`}>
        <div className="appt-tile-month">{month}</div>
        <div className="appt-tile-day">{day}</div>
        <div className="appt-tile-time">{time}</div>
      </div>

      <div className="appt-body">
        <div className="appt-title-row">
          <span className="appt-title">{a.title}</span>
          {a.isWsavaRecommended && !a.urgency && <span className="appt-badge wsava">✓ WSAVA</span>}
          {a.urgency && <span className="appt-badge urgency">🚨 Urgencia</span>}
          {a.isCancelled && <span className="appt-badge cancelled">{t('appointments.cancelled')}</span>}
        </div>

        {cd && <span className={`appt-countdown ${cd.tone}`}>⏱ {cd.label}</span>}

        <div className="appt-details">
          {a.vetName && <span className="appt-detail">👨‍⚕️ {a.vetName}</span>}
          {a.clinicName && <span className="appt-detail">🏥 {a.clinicName}</span>}
          {a.location && <span className="appt-detail">📍 {a.location}</span>}
        </div>

        {a.notes && <p className="appt-notes">{a.notes}</p>}

        {a.checklist?.length > 0 && (
          <details className="appt-checklist">
            <summary>📋 Checklist ({a.checklist.length})</summary>
            <ul>{a.checklist.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </details>
        )}
      </div>

      <div className="appt-actions">
        {!a.isCancelled && <button className="appt-act" onClick={() => onCancel(a._id)}>{t('appointments.cancelAppointment')}</button>}
        <button className="appt-act del" onClick={() => onDelete(a._id)}>{t('common.delete')}</button>
      </div>
    </article>
  );
}

export default function AppointmentListPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([getAppointments(dogId), getDog(dogId)])
      .then(([apptData, dogData]) => { setAppointments(apptData.data.appointments); setDog(dogData.data); })
      .catch(() => setError(t('appointments.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  async function handleAdd(formData) {
    try {
      const { data } = await createAppointment(dogId, formData);
      setAppointments((prev) => [...prev, data].sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate)));
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
    } catch { setError(t('appointments.errors.cancel')); }
  }

  async function handleDelete(apptId) {
    if (!window.confirm(t('appointments.deleteConfirm'))) return;
    try {
      await deleteAppointment(dogId, apptId);
      setAppointments((prev) => prev.filter((a) => a._id !== apptId));
    } catch { setError(t('appointments.errors.delete')); }
  }

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  const upcoming = appointments.filter(isUpcoming).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
  const past = appointments.filter((a) => !isUpcoming(a)).sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  const name = dog?.name || '';

  return (
    <div className="appt-page">
      <BackLink />

      <div className="appt-hero">
        {dog?.photoUrl
          ? <img className="appt-hero-avatar" src={dog.photoUrl} alt={name} />
          : <span className="appt-hero-ph">🏥</span>}
        <div>
          <h1>{t('appointments.title')}{name ? ` · ${name}` : ''}</h1>
          <p>No te pierdas ningún control de {name || 'tu perro'} 🐾</p>
        </div>
        <div className="appt-hero-spacer" />
        <button onClick={() => setShowForm(!showForm)} className={`appt-add ${showForm ? 'cancel' : ''}`}>
          {showForm ? t('common.cancel') : `＋ ${t('appointments.add')}`}
        </button>
      </div>

      {showForm && <AddAppointmentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} t={t} />}
      {error && <p className="server-error">{error}</p>}

      {appointments.length === 0 && (
        <div className="appt-empty">
          <div className="appt-empty-emoji">📅</div>
          <p>Todavía no agendaste citas para {name || 'tu perro'}.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="appt-section">
          <h2 className="appt-section-title">Próximas <span className="appt-count">{upcoming.length}</span></h2>
          {upcoming.map((a) => <AppointmentCard key={a._id} a={a} onCancel={handleCancel} onDelete={handleDelete} t={t} />)}
        </section>
      )}

      {past.length > 0 && (
        <section className="appt-section">
          <h2 className="appt-section-title">Pasadas y canceladas <span className="appt-count">{past.length}</span></h2>
          {past.map((a) => <AppointmentCard key={a._id} a={a} onCancel={handleCancel} onDelete={handleDelete} t={t} />)}
        </section>
      )}
    </div>
  );
}

function AddAppointmentForm({ onAdd, onCancel, t }) {
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [form, setForm] = useState({ appointmentDate: '', vetName: '', clinicName: '', location: '', notes: '' });
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
      title: catalogMeta.title, catalogId: catalogMeta.catalogId,
      isWsavaRecommended: catalogMeta.isWsavaRecommended, appointmentType: catalogMeta.appointmentType,
      checklist: catalogMeta.checklist || [], appointmentDate: form.appointmentDate,
      vetName: form.vetName, clinicName: form.clinicName, location: form.location,
      notes: form.notes || catalogMeta.notes || '',
    };
    const err = await onAdd(payload);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="appt-form">
      <h2>📅 Agendar una cita</h2>
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
        <button type="submit" className="appt-form-save" disabled={loading}>{loading ? t('vaccinations.saving') : t('common.save')}</button>
        <button type="button" className="appt-form-cancel" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}
