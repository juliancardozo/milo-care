import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getVaccinations, getMedications, getAppointments, getSymptoms } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

const now = new Date();

function isAppliedVaccine(v) {
  return v.status === 'completed' || v.source === 'manual';
}

function isFutureAppointment(a) {
  return a.appointmentDate && new Date(a.appointmentDate) >= now;
}

const SEVERITY_LABELS = { mild: 'Leve', moderate: 'Moderado', severe: 'Grave' };

const VAX_STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  programado: 'Programada',
  pending_vet_validation: 'Pendiente validación',
  completed: 'Aplicada',
};

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

  const appliedVax = data.vaccinations.filter(isAppliedVaccine);
  const suggestedVax = data.vaccinations.filter((v) => !isAppliedVaccine(v));

  const pastAppointments = data.appointments.filter((a) => !isFutureAppointment(a));
  const upcomingAppointments = data.appointments.filter(isFutureAppointment);

  return (
    <div className="page">
      <BackLink />
      <h1>{t('history.title')}</h1>
      {error && <p className="server-error">{error}</p>}

      {/* ── Vacunas ─────────────────────────────────────────── */}
      <section className="card">
        <h2>{t('history.vaccinations')} ({data.vaccinations.length})</h2>

        {data.vaccinations.length === 0 && <p className="list-empty">{t('history.none')}</p>}

        {appliedVax.length > 0 && (
          <>
            <h3 style={{ marginTop: '12px', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aplicadas
            </h3>
            <ul className="history-list">
              {appliedVax.map((v) => (
                <li key={v._id}>
                  <strong>{v.vaccineName}</strong>
                  {v.dateAdministered && <> — {new Date(v.dateAdministered).toLocaleDateString('es-AR')}</>}
                  {v.nextDueDate && <> · Próxima: {new Date(v.nextDueDate).toLocaleDateString('es-AR')}</>}
                </li>
              ))}
            </ul>
          </>
        )}

        {suggestedVax.length > 0 && (
          <>
            <h3 style={{ marginTop: '16px', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sugeridas / próximas
            </h3>
            <ul className="history-list">
              {suggestedVax.map((v) => (
                <li key={v._id}>
                  <strong>{v.vaccineName}</strong>
                  {v.nextDueDate && <> — {new Date(v.nextDueDate).toLocaleDateString('es-AR')}</>}
                  {' '}
                  <span className="badge badge-mild">{VAX_STATUS_LABELS[v.status] || v.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── Medicamentos ────────────────────────────────────── */}
      <section className="card">
        <h2>{t('history.medications')} ({data.medications.length})</h2>
        {data.medications.length === 0 ? <p className="list-empty">{t('history.none')}</p> : (
          <ul className="history-list">
            {data.medications.map((m) => (
              <li key={m._id}>
                <strong>{m.medicationName}</strong> — {m.dosage}
                {' '}
                <span className={`badge ${m.isActive ? 'badge-active' : 'badge-inactive'}`}>
                  {m.isActive ? t('history.active') : t('history.completed')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Consultas ───────────────────────────────────────── */}
      <section className="card">
        <h2>{t('history.appointments')} ({data.appointments.length})</h2>

        {data.appointments.length === 0 && <p className="list-empty">{t('history.none')}</p>}

        {upcomingAppointments.length > 0 && (
          <>
            <h3 style={{ marginTop: '12px', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Próximas
            </h3>
            <ul className="history-list">
              {upcomingAppointments.map((a) => (
                <li key={a._id}>
                  <strong>{a.title || a.clinicName || 'Consulta'}</strong> — {new Date(a.appointmentDate).toLocaleDateString('es-AR')}
                  {a.isCancelled && <> · <span className="badge badge-cancelled">{t('history.cancelled')}</span></>}
                </li>
              ))}
            </ul>
          </>
        )}

        {pastAppointments.length > 0 && (
          <>
            <h3 style={{ marginTop: '16px', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pasadas
            </h3>
            <ul className="history-list">
              {pastAppointments.map((a) => (
                <li key={a._id}>
                  <strong>{a.title || a.clinicName || 'Consulta'}</strong> — {new Date(a.appointmentDate).toLocaleDateString('es-AR')}
                  {a.isCancelled && <> · <span className="badge badge-cancelled">{t('history.cancelled')}</span></>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── Síntomas ────────────────────────────────────────── */}
      <section className="card">
        <h2>{t('history.symptoms')} ({data.symptoms.length})</h2>
        {data.symptoms.length === 0 ? <p className="list-empty">{t('history.none')}</p> : (
          <ul className="history-list">
            {data.symptoms.map((s) => (
              <li key={s._id}>
                <strong>{s.description}</strong>
                {s.severity && <> · <span className={`badge badge-${s.severity}`}>{SEVERITY_LABELS[s.severity] || s.severity}</span></>}
                {' '}— {new Date(s.dateObserved).toLocaleDateString('es-AR')}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
