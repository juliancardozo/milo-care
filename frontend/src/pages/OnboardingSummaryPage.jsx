import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetOnboarding } from '../store/onboardingSlice';
import RiskProfileBadge from '../components/calendar/RiskProfileBadge';
import DisclosureWarning from '../components/onboarding/DisclosureWarning';

const STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  programado: 'Programada',
  completed: 'Aplicada',
  cancelled: 'Cancelada',
  vencido: 'Vencida',
  pending_vet_validation: 'Pendiente de validación veterinaria',
};

function isAppliedVaccine(v) {
  return v.status === 'completed' || v.source === 'manual' || v.administeredAt;
}

function VaccineSubList({ title, events, nameKey }) {
  if (events.length === 0) return null;
  return (
    <>
      <h3 style={{ marginTop: '12px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <ul className="record-list">
        {events.map((event, index) => (
          <li key={`${title}-${event.id || index}`} className="record-item">
            <strong>{event[nameKey]}</strong>
            <span>Estado: {STATUS_LABELS[event.status] || event.status}</span>
            <span>Fecha: {event.nextDueAt ? new Date(event.nextDueAt).toLocaleDateString('es-AR') : 'A confirmar'}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function VaccineEventList({ events = [] }) {
  const applied = events.filter(isAppliedVaccine);
  const suggested = events.filter((v) => !isAppliedVaccine(v));
  if (events.length === 0) return <p>Sin eventos de vacunas generados.</p>;
  return (
    <>
      <VaccineSubList title="Aplicadas" events={applied} nameKey="vaccineType" />
      <VaccineSubList title="Sugeridas / próximas" events={suggested} nameKey="vaccineType" />
    </>
  );
}

function EventList({ title, events = [], nameKey }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {events.length === 0 ? (
        <p>Sin eventos generados aún.</p>
      ) : (
        <ul className="record-list">
          {events.map((event, index) => (
            <li key={`${title}-${event.id || index}`} className="record-item">
              <strong>{event[nameKey]}</strong>
              <span>Estado: {STATUS_LABELS[event.status] || event.status}</span>
              <span>Fecha: {event.nextDueAt ? new Date(event.nextDueAt).toLocaleDateString('es-AR') : 'A confirmar'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function OnboardingSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Summary is passed via navigation state so the Redux store can be reset
  // immediately after confirmation. On page refresh nav state is lost, showing
  // the fallback with a link to restart onboarding.
  const summary = location.state?.summary ?? null;

  const riskLevel = summary?.calendar?.riskProfile?.level ?? null;

  function handleGoToDashboard() {
    dispatch(resetOnboarding());
    navigate('/dashboard');
  }

  if (!summary) {
    return (
      <div className="page">
        <h1>Resumen del onboarding</h1>
        <p>Completá el flujo de onboarding para generar el calendario preventivo.</p>
        <button type="button" onClick={() => { dispatch(resetOnboarding()); navigate('/dogs/new'); }}>
          Ir al onboarding
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Plan preventivo inicial</h1>
      <DisclosureWarning />

      <section className="card">
        <h2>Perfil del perro</h2>
        <p><strong>Nombre:</strong> {summary.dog?.name}</p>
        <p><strong>Raza:</strong> {summary.dog?.breed}</p>
        <p><strong>Etapa de vida:</strong> {summary.dog?.lifeStage}</p>
        {riskLevel && (
          <p><strong>Perfil de riesgo:</strong> <RiskProfileBadge level={riskLevel} /></p>
        )}
      </section>

      <section className="card">
        <h2>Calendario de vacunas</h2>
        <VaccineEventList events={summary.calendar?.vaccines || []} />
      </section>

      <EventList
        title="Calendario de desparasitación"
        events={summary.calendar?.deworming || []}
        nameKey="productName"
      />

      <section className="card">
        <h2>Consultas sugeridas</h2>
        {(summary.calendar?.appointments || []).length === 0 ? (
          <p>Sin consultas sugeridas aún.</p>
        ) : (
          <ul className="record-list">
            {summary.calendar.appointments.map((event, index) => (
              <li key={`consulta-${event.id || index}`} className="record-item">
                <strong>{event.type}</strong>
                <span>Estado: {STATUS_LABELS[event.status] || event.status}</span>
                <span>Fecha sugerida: {event.scheduledAt ? new Date(event.scheduledAt).toLocaleDateString('es-AR') : 'A confirmar'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Datos faltantes</h2>
        {(summary.calendar?.missingData || []).length === 0 ? (
          <p>Tu perfil tiene los datos mínimos necesarios para los recordatorios.</p>
        ) : (
          <ul>
            {(summary.calendar.missingData || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="form-actions">
        <button type="button" className="btn-primary" onClick={handleGoToDashboard}>
          Ir al dashboard
        </button>
      </section>
    </div>
  );
}
