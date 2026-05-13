import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSymptoms, createSymptom, deleteSymptom } from '../services/api';

const SEVERITY_LABELS = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

export default function SymptomLogPage() {
  const { dogId } = useParams();
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getSymptoms(dogId)
      .then(({ data }) => setSymptoms(data.symptoms))
      .catch(() => setError('Failed to load symptoms.'))
      .finally(() => setLoading(false));
  }, [dogId]);

  async function handleAdd(formData) {
    try {
      const { data } = await createSymptom(dogId, formData);
      setSymptoms((prev) => [data, ...prev]);
      setShowForm(false);
    } catch (err) {
      return err.response?.data?.message || 'Failed to add symptom.';
    }
  }

  async function handleDelete(symId) {
    if (!window.confirm('Delete this symptom record?')) return;
    try {
      await deleteSymptom(dogId, symId);
      setSymptoms((prev) => prev.filter((s) => s._id !== symId));
    } catch {
      setError('Failed to delete symptom record.');
    }
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Symptom Log</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Log symptom'}
        </button>
      </header>

      {showForm && <AddSymptomForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}
      {error && <p className="server-error">{error}</p>}

      {symptoms.length === 0 ? (
        <p>No symptoms logged yet.</p>
      ) : (
        <ul className="record-list">
          {symptoms.map((s) => (
            <li key={s._id} className={`record-item severity-${s.severity}`}>
              <strong>{s.description}</strong>
              <span className={`badge-severity badge-${s.severity}`}>{SEVERITY_LABELS[s.severity]}</span>
              <span>{new Date(s.dateObserved).toLocaleDateString()}</span>
              {s.notes && <p className="notes">{s.notes}</p>}
              <button onClick={() => handleDelete(s._id)} className="btn-danger-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}

function AddSymptomForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ description: '', severity: 'mild', dateObserved: new Date().toISOString().split('T')[0], notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description || !form.dateObserved) { setError('Description and date are required.'); return; }
    setError('');
    setLoading(true);
    const err = await onAdd(form);
    if (err) { setError(err); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="field">
        <label>Description</label>
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Limping on left leg" />
      </div>
      <div className="field">
        <label>Severity</label>
        <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
      </div>
      <div className="field">
        <label>Date observed</label>
        <input type="date" value={form.dateObserved} onChange={(e) => setForm({ ...form, dateObserved: e.target.value })} max={new Date().toISOString().split('T')[0]} />
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
