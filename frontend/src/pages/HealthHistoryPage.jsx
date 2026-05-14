import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVaccinations, getMedications, getAppointments, getSymptoms } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

export default function HealthHistoryPage() {
  const { t } = useI18n();
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
      .catch(() => setError(t('history.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  if (loading) return <div className="page"><p>{t('history.loading')}</p></div>;

  return (
    <div className="page">
      <h1>{t('history.title')}</h1>
      {error && <p className="server-error">{error}</p>}

      <section>
        <h2>{t('history.vaccinations')} ({data.vaccinations.length})</h2>
        {data.vaccinations.length === 0 ? <p>{t('history.none')}</p> : (
          <ul className="history-list">
            {data.vaccinations.map((v) => (
              <li key={v._id}><strong>{v.vaccineName}</strong> — {new Date(v.dateAdministered).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t('history.medications')} ({data.medications.length})</h2>
        {data.medications.length === 0 ? <p>{t('history.none')}</p> : (
          <ul className="history-list">
            {data.medications.map((m) => (
              <li key={m._id}><strong>{m.medicationName}</strong> — {m.dosage} · {m.isActive ? t('history.active') : t('history.completed')}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t('history.appointments')} ({data.appointments.length})</h2>
        {data.appointments.length === 0 ? <p>{t('history.none')}</p> : (
          <ul className="history-list">
            {data.appointments.map((a) => (
              <li key={a._id}><strong>{a.title}</strong> — {new Date(a.appointmentDate).toLocaleDateString()} {a.isCancelled ? `(${t('history.cancelled')})` : ''}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t('history.symptoms')} ({data.symptoms.length})</h2>
        {data.symptoms.length === 0 ? <p>{t('history.none')}</p> : (
          <ul className="history-list">
            {data.symptoms.map((s) => (
              <li key={s._id}><strong>{s.description}</strong> — {s.severity} · {new Date(s.dateObserved).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}
