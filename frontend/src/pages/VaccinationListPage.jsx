import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVaccinations, createVaccination, deleteVaccination } from '../services/api';

export default function VaccinationListPage() {
  const { dogId } = useParams();
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getVaccinations(dogId)
      .then(({ data }) => setVaccinations(data.vaccinations))
      .catch(() => setError('Failed to load vaccinations.'))
      .finally(() => setLoading(false));
  }, [dogId]);

  async function handleAdd(formData) {
    try {
      const { data } = await createVaccination(dogId, formData);
      setVaccinations((prev) => [...prev, data]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || 'Failed to add vaccination.';
    }
  }

  async function handleDelete(vacId) {
    if (!window.confirm('Delete this vaccination record?')) return;
    try {
      await deleteVaccination(dogId, vacId);
      setVaccinations((prev) => prev.filter((v) => v._id !== vacId));
    } catch {
      setError('Failed to delete vaccination.');
    }
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Vaccinations</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add vaccination'}
        </button>
      </header>

      {showForm && <AddVaccinationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}
      {error && <p className="server-error">{error}</p>}

      {vaccinations.length === 0 ? (
        <p>No vaccination records yet.</p>
      ) : (
        <ul className="record-list">
          {vaccinations.map((v) => (
            <li key={v._id} className="record-item">
              <strong>{v.vaccineName}</strong>
              <span>Administered: {new Date(v.dateAdministered).toLocaleDateString()}</span>
              {v.nextDueDate && <span>Next due: {new Date(v.nextDueDate).toLocaleDateString()}</span>}
              {v.notes && <p className="notes">{v.notes}</p>}
              <button onClick={() => handleDelete(v._id)} className="btn-danger-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}

function AddVaccinationForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ vaccineName: '', dateAdministered: '', nextDueDate: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vaccineName || !form.dateAdministered) { setError('Vaccine name and date administered are required.'); return; }
    setError('');
    setLoading(true);
    const err = await onAdd({ ...form, nextDueDate: form.nextDueDate || undefined });
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>Vaccine name</label>
        <input type="text" value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} />
      </div>
      <div className="field">
        <label>Date administered</label>
        <input type="date" value={form.dateAdministered} onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })} max={new Date().toISOString().split('T')[0]} />
      </div>
      <div className="field">
        <label>Next due date (optional)</label>
        <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
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
