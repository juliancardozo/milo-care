import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVaccinations, getMedications, getAppointments, getSymptoms } from '../services/api';

export default function HealthHistoryPage() {
  const { dogId } = useParams();
  const [data, setData] = useState({ vaccinations: [], medications: [], appointments: [], symptoms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getVaccinations(dogId),
      getMedications(dogId),
      getAppointments(dogId),
      getSymptoms(dogId),
    ])
      .then(([vacc, meds, appts, symp]) => {
        setData({
          vaccinations: vacc.data.vaccinations,
          medications: meds.data.medications,
          appointments: appts.data.appointments,
          symptoms: symp.data.symptoms,
        });
      })
      .catch(() => setError('Failed to load health history.'))
      .finally(() => setLoading(false));
  }, [dogId]);

  if (loading) return <div className="page"><p>Loading health history…</p></div>;

  return (
    <div className="page">
      <h1>Full Health History</h1>
      {error && <p className="server-error">{error}</p>}

      <section>
        <h2>Vaccinations ({data.vaccinations.length})</h2>
        {data.vaccinations.length === 0 ? <p>None recorded.</p> : (
          <ul className="history-list">
            {data.vaccinations.map((v) => (
              <li key={v._id}><strong>{v.vaccineName}</strong> — {new Date(v.dateAdministered).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Medications ({data.medications.length})</h2>
        {data.medications.length === 0 ? <p>None recorded.</p> : (
          <ul className="history-list">
            {data.medications.map((m) => (
              <li key={m._id}><strong>{m.medicationName}</strong> — {m.dosage} · {m.isActive ? 'Active' : 'Completed'}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Appointments ({data.appointments.length})</h2>
        {data.appointments.length === 0 ? <p>None recorded.</p> : (
          <ul className="history-list">
            {data.appointments.map((a) => (
              <li key={a._id}><strong>{a.title}</strong> — {new Date(a.appointmentDate).toLocaleDateString()} {a.isCancelled ? '(Cancelled)' : ''}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Symptoms ({data.symptoms.length})</h2>
        {data.symptoms.length === 0 ? <p>None recorded.</p> : (
          <ul className="history-list">
            {data.symptoms.map((s) => (
              <li key={s._id}><strong>{s.description}</strong> — {s.severity} · {new Date(s.dateObserved).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}
