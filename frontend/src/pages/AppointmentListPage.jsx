import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../services/api';

export default function AppointmentListPage() {
  const { dogId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getAppointments(dogId)
      .then(({ data }) => setAppointments(data.appointments))
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false));
  }, [dogId]);

  async function handleAdd(formData) {
    try {
      const { data } = await createAppointment(dogId, formData);
      setAppointments((prev) => [...prev, data].sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate)));
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || 'Failed to add appointment.';
    }
  }

  async function handleCancel(apptId) {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const { data } = await updateAppointment(dogId, apptId, { isCancelled: true });
      setAppointments((prev) => prev.map((a) => (a._id === apptId ? data : a)));
    } catch {
      setError('Failed to cancel appointment.');
    }
  }

  async function handleDelete(apptId) {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await deleteAppointment(dogId, apptId);
      setAppointments((prev) => prev.filter((a) => a._id !== apptId));
    } catch {
      setError('Failed to delete appointment.');
    }
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Appointments</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add appointment'}
        </button>
      </header>

      {showForm && <AddAppointmentForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}
      {error && <p className="server-error">{error}</p>}

      {appointments.length === 0 ? (
        <p>No appointments yet.</p>
      ) : (
        <ul className="record-list">
          {appointments.map((a) => (
            <li key={a._id} className={`record-item ${a.isCancelled ? 'cancelled' : ''}`}>
              <strong>{a.title}</strong>
              <span>{new Date(a.appointmentDate).toLocaleString()}</span>
              {a.vetName && <span>Vet: {a.vetName}</span>}
              {a.location && <span>Location: {a.location}</span>}
              {a.isCancelled && <span className="badge-cancelled">Cancelled</span>}
              {a.notes && <p className="notes">{a.notes}</p>}
              <div className="record-actions">
                {!a.isCancelled && <button onClick={() => handleCancel(a._id)} className="btn-secondary-sm">Cancel appt</button>}
                <button onClick={() => handleDelete(a._id)} className="btn-danger-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}

function AddAppointmentForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', appointmentDate: '', vetName: '', location: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.appointmentDate) { setError('Title and appointment date are required.'); return; }
    setError('');
    setLoading(true);
    const err = await onAdd(form);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>Title</label>
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual check-up" />
      </div>
      <div className="field">
        <label>Date & time</label>
        <input type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
      </div>
      <div className="field">
        <label>Vet name (optional)</label>
        <input type="text" value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })} />
      </div>
      <div className="field">
        <label>Location (optional)</label>
        <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="field">
        <label>Notes (optional)</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
