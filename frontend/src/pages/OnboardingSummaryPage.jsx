import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetOnboarding } from '../store/onboardingSlice';
import RiskProfileBadge from '../components/calendar/RiskProfileBadge';
import DisclosureWarning from '../components/onboarding/DisclosureWarning';
import '../styles/onboarding-summary.css';

const STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  programado: 'Programada',
  completed: 'Aplicada',
  cancelled: 'Cancelada',
  vencido: 'Vencida',
  pending_vet_validation: 'A validar con tu vet',
};

// Estado → color del badge
const STATUS_TONE = {
  completed: 'done',
  suggested: 'info',
  upcoming: 'info',
  programado: 'info',
  vencido: 'danger',
  pending_vet_validation: 'warn',
  cancelled: 'muted',
};

const LIFE_STAGE_LABELS = {
  unknown: 'Edad a confirmar',
  neonatal: 'Recién nacido',
  early_puppy: 'Cachorro',
  late_puppy: 'Cachorro grande',
  young_adult: 'Adulto joven',
  adult: 'Adulto',
  senior: 'Senior',
};

const APPOINTMENT_TYPE_LABELS = {
  initial_consult: 'Consulta inicial',
  follow_up: 'Control de seguimiento',
  checkup: 'Chequeo general',
};

const MISSING_DATA = {
  veterinarian: { icon: '🩺', label: 'Veterinario de confianza', hint: 'Sumalo para personalizar recordatorios y consultas.' },
  birthDate: { icon: '🎂', label: 'Fecha de nacimiento', hint: 'Ajusta el calendario a la edad real de tu perro.' },
  vaccine_history: { icon: '💉', label: 'Historial de vacunas', hint: 'Cargá lo aplicado para no repetir dosis.' },
};

function fmtDate(value) {
  if (!value) return 'A confirmar';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'A confirmar';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function dueOf(event) {
  return event.nextDueAt || event.nextDueDate || event.scheduledAt || null;
}

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || 'muted';
  return <span className={`onb-badge onb-badge-${tone}`}>{STATUS_LABELS[status] || status}</span>;
}

function isAppliedVaccine(v) {
  return v.status === 'completed' || v.source === 'manual' || v.administeredAt;
}

function EventRow({ icon, name, status, date, dateLabel = 'Próxima' }) {
  return (
    <li className="onb-item">
      <span className="onb-item-icon" aria-hidden="true">{icon}</span>
      <div className="onb-item-body">
        <span className="onb-item-name">{name}</span>
        <span className="onb-item-date">{dateLabel}: {fmtDate(date)}</span>
      </div>
      <StatusBadge status={status} />
    </li>
  );
}

function Section({ icon, title, count, children }) {
  return (
    <section className="onb-section card">
      <header className="onb-section-head">
        <h2 className="onb-section-title"><span aria-hidden="true">{icon}</span> {title}</h2>
        {count > 0 && <span className="onb-section-count">{count}</span>}
      </header>
      {children}
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
      <div className="page onb-summary">
        <div className="onb-empty">
          <span className="onb-empty-icon" aria-hidden="true">🐾</span>
          <h1>Tu plan preventivo te espera</h1>
          <p>Completá el onboarding para generar el calendario de vacunas y cuidados de tu perro.</p>
          <button type="button" className="onb-btn-primary" onClick={() => { dispatch(resetOnboarding()); navigate('/dogs/new'); }}>
            Empezar onboarding
          </button>
        </div>
      </div>
    );
  }

  const dog = summary.dog || {};
  const vaccines = summary.calendar?.vaccines || [];
  const deworming = summary.calendar?.deworming || [];
  const appointments = summary.calendar?.appointments || [];
  const missingData = summary.calendar?.missingData || [];

  const appliedVax = vaccines.filter(isAppliedVaccine);
  const suggestedVax = vaccines.filter((v) => !isAppliedVaccine(v));
  const totalPlanned = suggestedVax.length + deworming.length + appointments.length;

  return (
    <div className="page onb-summary">
      {/* Hero celebratorio: este es el momento "aha" del onboarding */}
      <header className="onb-hero">
        <span className="onb-hero-emoji" aria-hidden="true">🎉</span>
        <h1 className="onb-hero-title">¡Listo! El plan de {dog.name || 'tu perro'} está armado</h1>
        <p className="onb-hero-sub">Generamos su calendario preventivo. Revisalo y lo tenés siempre a mano en el panel.</p>
        <div className="onb-chips">
          {dog.breed && <span className="onb-chip">🐕 {dog.breed}</span>}
          {dog.lifeStage && <span className="onb-chip">{LIFE_STAGE_LABELS[dog.lifeStage] || dog.lifeStage}</span>}
          {riskLevel && <RiskProfileBadge level={riskLevel} />}
        </div>
      </header>

      {/* Stats de un vistazo */}
      <div className="onb-stats">
        <div className="onb-stat">
          <span className="onb-stat-num">{vaccines.length}</span>
          <span className="onb-stat-label">Vacunas</span>
        </div>
        <div className="onb-stat">
          <span className="onb-stat-num">{deworming.length}</span>
          <span className="onb-stat-label">Desparasitación</span>
        </div>
        <div className="onb-stat">
          <span className="onb-stat-num">{appointments.length}</span>
          <span className="onb-stat-label">Consultas</span>
        </div>
      </div>

      <DisclosureWarning />

      {/* Vacunas */}
      <Section icon="💉" title="Calendario de vacunas" count={vaccines.length}>
        {vaccines.length === 0 ? (
          <p className="onb-empty-line">Sin vacunas generadas todavía.</p>
        ) : (
          <>
            {appliedVax.length > 0 && (
              <>
                <h3 className="onb-subhead">Ya aplicadas</h3>
                <ul className="onb-list">
                  {appliedVax.map((v, i) => (
                    <EventRow key={v.id || `a-${i}`} icon="✅" name={v.vaccineType} status={v.status} date={dueOf(v)} dateLabel="Próxima" />
                  ))}
                </ul>
              </>
            )}
            {suggestedVax.length > 0 && (
              <>
                <h3 className="onb-subhead">Sugeridas / próximas</h3>
                <ul className="onb-list">
                  {suggestedVax.map((v, i) => (
                    <EventRow key={v.id || `s-${i}`} icon="💉" name={v.vaccineType} status={v.status} date={dueOf(v)} dateLabel="Próxima" />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Section>

      {/* Desparasitación */}
      <Section icon="🪱" title="Desparasitación" count={deworming.length}>
        {deworming.length === 0 ? (
          <p className="onb-empty-line">Sin eventos de desparasitación generados.</p>
        ) : (
          <ul className="onb-list">
            {deworming.map((d, i) => (
              <EventRow key={d.id || `d-${i}`} icon="🪱" name={d.productName} status={d.status} date={dueOf(d)} dateLabel="Próxima" />
            ))}
          </ul>
        )}
      </Section>

      {/* Consultas */}
      <Section icon="🏥" title="Consultas sugeridas" count={appointments.length}>
        {appointments.length === 0 ? (
          <p className="onb-empty-line">Sin consultas sugeridas todavía.</p>
        ) : (
          <ul className="onb-list">
            {appointments.map((a, i) => (
              <EventRow
                key={a.id || `c-${i}`}
                icon="🏥"
                name={APPOINTMENT_TYPE_LABELS[a.type] || a.type}
                status={a.status}
                date={a.scheduledAt}
                dateLabel="Sugerida"
              />
            ))}
          </ul>
        )}
      </Section>

      {/* Datos faltantes → reformulado como "completá tu perfil" */}
      {missingData.length > 0 && (
        <section className="onb-section card onb-missing">
          <header className="onb-section-head">
            <h2 className="onb-section-title"><span aria-hidden="true">✨</span> Mejorá tu plan</h2>
          </header>
          <p className="onb-missing-intro">Sumando estos datos, el calendario se vuelve más preciso:</p>
          <ul className="onb-missing-list">
            {missingData.map((item) => {
              const meta = MISSING_DATA[item] || { icon: '•', label: item, hint: '' };
              return (
                <li key={item} className="onb-missing-item">
                  <span className="onb-missing-icon" aria-hidden="true">{meta.icon}</span>
                  <div>
                    <span className="onb-missing-label">{meta.label}</span>
                    {meta.hint && <span className="onb-missing-hint">{meta.hint}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Acción principal */}
      <div className="onb-actions">
        <button type="button" className="onb-btn-primary" onClick={handleGoToDashboard}>
          Ir al panel de {dog.name || 'mi perro'} →
        </button>
        {totalPlanned > 0 && (
          <p className="onb-actions-note">{totalPlanned} recordatorio{totalPlanned !== 1 ? 's' : ''} listo{totalPlanned !== 1 ? 's' : ''} en tu panel.</p>
        )}
      </div>
    </div>
  );
}
