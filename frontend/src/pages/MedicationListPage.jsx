import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMedications, createMedication, updateMedication, deleteMedication } from '../services/api';

export default function MedicationListPage() {
  const { dogId } = useParams();
  const [medications, setMedications] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getMedications(dogId, showInactive ? {} : { active: 'true' })
      .then(({ data }) => setMedications(data.medications))
      .catch(() => setError('Failed to load medications.'))
      .finally(() => setLoading(false));
  }, [dogId, showInactive]);

  async function handleAdd(formData) {
    try {
      const { data } = await createMedication(dogId, formData);
      setMedications((prev) => [...prev, data]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || 'Failed to add medication.';
    }
  }

  async function handleMarkInactive(medId) {
    try {
      const { data } = await updateMedication(dogId, medId, { isActive: false });
      setMedications((prev) => prev.map((m) => (m._id === medId ? data : m)));
    } catch {
      setError('Failed to update medication.');
    }
  }

  async function handleDelete(medId) {
    if (!window.confirm('Delete this medication record?')) return;
    try {
      await deleteMedication(dogId, medId);
      setMedications((prev) => prev.filter((m) => m._id !== medId));
    } catch {
      setError('Failed to delete medication.');
    }
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Medications</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add medication'}
        </button>
      </header>

      {showForm && <AddMedicationForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}
      {error && <p className="server-error">{error}</p>}

      <label className="toggle-label">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show inactive medications
      </label>

      {medications.length === 0 ? (
        <p>No medication records{showInactive ? '' : ' (active)'}.</p>
      ) : (
        <ul className="record-list">
          {medications.map((m) => (
            <li key={m._id} className={`record-item ${!m.isActive ? 'inactive' : ''}`}>
              <strong>{m.medicationName}</strong>
              <span>{m.dosage} · every {m.frequencyHours}h</span>
              <span>Started: {new Date(m.startDate).toLocaleDateString()}</span>
              {m.endDate && <span>Until: {new Date(m.endDate).toLocaleDateString()}</span>}
              {!m.isActive && <span className="badge-inactive">Inactive</span>}
              {m.notes && <p className="notes">{m.notes}</p>}
              <div className="record-actions">
                {m.isActive && <button onClick={() => handleMarkInactive(m._id)} className="btn-secondary-sm">Mark complete</button>}
                <button onClick={() => handleDelete(m._id)} className="btn-danger-sm">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}

function AddMedicationForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ medicationName: '', dosage: '', frequencyHours: '', startDate: '', endDate: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.medicationName || !form.dosage || !form.frequencyHours || !form.startDate) {
      setError('Medication name, dosage, frequency, and start date are required.');
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
        <label>Medication name</label>
        <input type="text" value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} />
      </div>
      <div className="field">
        <label>Dosage</label>
        <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 10mg" />
      </div>
      <div className="field">
        <label>Frequency (hours)</label>
        <input type="number" min="1" value={form.frequencyHours} onChange={(e) => setForm({ ...form, frequencyHours: e.target.value })} />
      </div>
      <div className="field">
        <label>Start date</label>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="field">
        <label>End date (optional)</label>
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
