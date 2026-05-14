import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

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

      {appointments.length === 0 ? (
        <p>{t('appointments.noRecords')}</p>
      ) : (
        <ul className="record-list">
          {appointments.map((a) => (
            <li key={a._id} className={`record-item ${a.isCancelled ? 'cancelled' : ''}`}>
              <strong>{a.title}</strong>
              <span>{new Date(a.appointmentDate).toLocaleString()}</span>
              {a.vetName && <span>{t('appointments.vet')}: {a.vetName}</span>}
              {a.location && <span>{t('appointments.location')}: {a.location}</span>}
              {a.isCancelled && <span className="badge-cancelled">{t('appointments.cancelled')}</span>}
              {a.notes && <p className="notes">{a.notes}</p>}
              <div className="record-actions">
                {!a.isCancelled && <button onClick={() => handleCancel(a._id)} className="btn-secondary-sm">{t('appointments.cancelAppointment')}</button>}
                <button onClick={() => handleDelete(a._id)} className="btn-danger-sm">{t('common.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}

function AddAppointmentForm({ onAdd, onCancel, t }) {
  const [form, setForm] = useState({ title: '', appointmentDate: '', vetName: '', location: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.appointmentDate) { setError(t('appointments.titleDateRequired')); return; }
    setError('');
    setLoading(true);
    const err = await onAdd(form);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>{t('appointments.apptTitle')}</label>
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('appointments.apptTitlePlaceholder')} />
      </div>
      <div className="field">
        <label>{t('appointments.dateTime')}</label>
        <input type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('appointments.vetOptional')}</label>
        <input type="text" value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('appointments.locationOptional')}</label>
        <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
