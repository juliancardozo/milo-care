import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getVaccinations, getMedications, getAppointments, getSymptoms } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/health-history.css';

const now = new Date();

function isAppliedVaccine(v) {
  return v.status === 'completed' || v.source === 'manual';
}
function isFutureAppointment(a) {
  return a.appointmentDate && new Date(a.appointmentDate) >= now;
}

const SEVERITY_LABELS = { mild: 'Leve', moderate: 'Moderado', severe: 'Grave' };
const SEVERITY_TONE = { mild: 'done', moderate: 'warn', severe: 'danger' };

const VAX_STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  programado: 'Programada',
  pending_vet_validation: 'A validar',
  completed: 'Aplicada',
};
const VAX_STATUS_TONE = {
  completed: 'done',
  suggested: 'info',
  upcoming: 'info',
  programado: 'info',
  pending_vet_validation: 'warn',
};

const CATEGORY_META = {
  vaccinations: { icon: '💉', accent: 'var(--color-primary)' },
  medications: { icon: '💊', accent: '#7c3aed' },
  appointments: { icon: '🏥', accent: '#f59e0b' },
  symptoms: { icon: '🩺', accent: '#0d9488' },
};

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ tone = 'muted', children }) {
  return <span className={`hh-badge hh-badge-${tone}`}>{children}</span>;
}

function HistoryItem({ category, title, meta, date, badge }) {
  const m = CATEGORY_META[category];
  return (
    <li className="hh-item" style={{ '--hh-accent': m.accent }}>
      <span className="hh-item-icon" aria-hidden="true">{m.icon}</span>
      <div className="hh-item-body">
        <span className="hh-item-title">{title}</span>
        {meta && <span className="hh-item-meta">{meta}</span>}
      </div>
      <div className="hh-item-right">
        {badge}
        {date && <span className="hh-item-date">{date}</span>}
      </div>
    </li>
  );
}

function Skeleton() {
  return (
    <div className="hh-skeletons" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="hh-skel-card">
          <span className="hh-skel-title" />
          {[0, 1].map((j) => (
            <div key={j} className="hh-skel-row"><span /><span /></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HealthHistoryPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [data, setData] = useState({ vaccinations: [], medications: [], appointments: [], symptoms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getVaccinations(dogId),
      getMedications(dogId),
      getAppointments(dogId),
      getSymptoms(dogId),
    ])
      .then(([vacc, meds, appts, symp]) => {
        setData({
          vaccinations: vacc.data.vaccinations || [],
          medications: meds.data.medications || [],
          appointments: appts.data.appointments || [],
          symptoms: symp.data.symptoms || [],
        });
      })
      .catch(() => setError(t('history.errors.load')))
      .finally(() => setLoading(false));
  }, [dogId, t]);

  const counts = {
    vaccinations: data.vaccinations.length,
    medications: data.medications.length,
    appointments: data.appointments.length,
    symptoms: data.symptoms.length,
  };
  const total = counts.vaccinations + counts.medications + counts.appointments + counts.symptoms;

  const appliedVax = useMemo(() => data.vaccinations.filter(isAppliedVaccine), [data.vaccinations]);
  const suggestedVax = useMemo(() => data.vaccinations.filter((v) => !isAppliedVaccine(v)), [data.vaccinations]);
  const upcomingAppts = useMemo(() => data.appointments.filter(isFutureAppointment), [data.appointments]);
  const pastAppts = useMemo(() => data.appointments.filter((a) => !isFutureAppointment(a)), [data.appointments]);

  const show = (cat) => filter === 'all' || filter === cat;

  const CATEGORIES = ['vaccinations', 'medications', 'appointments', 'symptoms'];

  return (
    <div className="page hh-page">
      <BackLink to={`/dogs/${dogId}`} />

      <header className="hh-header">
        <h1>{t('history.title')}</h1>
        <p className="hh-subtitle">{t('history.subtitle')}</p>
      </header>

      {error && <p className="server-error">{error}</p>}

      {loading ? (
        <Skeleton />
      ) : total === 0 ? (
        <div className="hh-empty">
          <span className="hh-empty-icon" aria-hidden="true">📋</span>
          <p className="hh-empty-title">{t('history.emptyAll')}</p>
        </div>
      ) : (
        <>
          {/* Filtros con conteo (doblan como resumen) */}
          <div className="hh-filters">
            <button className={`hh-chip ${filter === 'all' ? 'hh-chip-on' : ''}`} onClick={() => setFilter('all')}>
              {t('history.filterAll')} <span className="hh-chip-count">{total}</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`hh-chip ${filter === cat ? 'hh-chip-on' : ''}`}
                onClick={() => setFilter(cat)}
              >
                <span aria-hidden="true">{CATEGORY_META[cat].icon}</span> {t(`history.${cat}`)}
                <span className="hh-chip-count">{counts[cat]}</span>
              </button>
            ))}
          </div>

          {/* Vacunas */}
          {show('vaccinations') && (
            <section className="hh-section card">
              <h2 className="hh-section-title"><span aria-hidden="true">💉</span> {t('history.vaccinations')}</h2>
              {counts.vaccinations === 0 ? (
                <p className="list-empty">{t('history.none')}</p>
              ) : (
                <>
                  {appliedVax.length > 0 && (
                    <>
                      <h3 className="hh-subhead">{t('history.groupApplied')}</h3>
                      <ul className="hh-list">
                        {appliedVax.map((v) => (
                          <HistoryItem
                            key={v._id}
                            category="vaccinations"
                            title={v.vaccineName}
                            meta={v.nextDueDate ? `${t('history.nextDue')}: ${fmtDate(v.nextDueDate)}` : null}
                            date={fmtDate(v.dateAdministered)}
                            badge={<Badge tone="done">{VAX_STATUS_LABELS.completed}</Badge>}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                  {suggestedVax.length > 0 && (
                    <>
                      <h3 className="hh-subhead">{t('history.groupSuggested')}</h3>
                      <ul className="hh-list">
                        {suggestedVax.map((v) => (
                          <HistoryItem
                            key={v._id}
                            category="vaccinations"
                            title={v.vaccineName}
                            date={fmtDate(v.nextDueDate)}
                            badge={<Badge tone={VAX_STATUS_TONE[v.status] || 'info'}>{VAX_STATUS_LABELS[v.status] || v.status}</Badge>}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* Medicamentos */}
          {show('medications') && (
            <section className="hh-section card">
              <h2 className="hh-section-title"><span aria-hidden="true">💊</span> {t('history.medications')}</h2>
              {counts.medications === 0 ? (
                <p className="list-empty">{t('history.none')}</p>
              ) : (
                <ul className="hh-list">
                  {data.medications.map((m) => (
                    <HistoryItem
                      key={m._id}
                      category="medications"
                      title={m.medicationName}
                      meta={m.dosage}
                      badge={<Badge tone={m.isActive ? 'info' : 'muted'}>{m.isActive ? t('history.active') : t('history.completed')}</Badge>}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Consultas */}
          {show('appointments') && (
            <section className="hh-section card">
              <h2 className="hh-section-title"><span aria-hidden="true">🏥</span> {t('history.appointments')}</h2>
              {counts.appointments === 0 ? (
                <p className="list-empty">{t('history.none')}</p>
              ) : (
                <>
                  {upcomingAppts.length > 0 && (
                    <>
                      <h3 className="hh-subhead">{t('history.groupUpcoming')}</h3>
                      <ul className="hh-list">
                        {upcomingAppts.map((a) => (
                          <HistoryItem
                            key={a._id}
                            category="appointments"
                            title={a.title || a.clinicName || 'Consulta'}
                            date={fmtDate(a.appointmentDate)}
                            badge={a.isCancelled ? <Badge tone="danger">{t('history.cancelled')}</Badge> : null}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                  {pastAppts.length > 0 && (
                    <>
                      <h3 className="hh-subhead">{t('history.groupPast')}</h3>
                      <ul className="hh-list">
                        {pastAppts.map((a) => (
                          <HistoryItem
                            key={a._id}
                            category="appointments"
                            title={a.title || a.clinicName || 'Consulta'}
                            date={fmtDate(a.appointmentDate)}
                            badge={a.isCancelled ? <Badge tone="danger">{t('history.cancelled')}</Badge> : null}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* Síntomas */}
          {show('symptoms') && (
            <section className="hh-section card">
              <h2 className="hh-section-title"><span aria-hidden="true">🩺</span> {t('history.symptoms')}</h2>
              {counts.symptoms === 0 ? (
                <p className="list-empty">{t('history.none')}</p>
              ) : (
                <ul className="hh-list">
                  {data.symptoms.map((s) => (
                    <HistoryItem
                      key={s._id}
                      category="symptoms"
                      title={s.description}
                      date={fmtDate(s.dateObserved)}
                      badge={s.severity ? <Badge tone={SEVERITY_TONE[s.severity] || 'muted'}>{SEVERITY_LABELS[s.severity] || s.severity}</Badge> : null}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
