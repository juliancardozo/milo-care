import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectIsVet } from '../store/authSlice';
import { getDogs, getFullRemindersList } from '../services/api';
import OfflineIndicator from '../components/OfflineIndicator';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserMenu from '../components/UserMenu';
import UpgradeBanner from '../components/UpgradeBanner';
import CheckinCard from '../components/checkin/CheckinCard';
import DogContextHeader from '../components/DogContextHeader';
import QuickActionsFab from '../components/QuickActionsFab';
import BottomNav from '../components/BottomNav';
import ExploreMenu from '../components/ExploreMenu';
import LocationConsentModal, { wasLocationPromptDismissed } from '../components/LocationConsentModal';
import MilestoneCelebration from '../components/MilestoneCelebration';
import PreventiveCareCard from '../components/PreventiveCareCard';
import { getMilestones } from '../services/milestoneApi';
import { useI18n } from '../i18n/I18nProvider';
import { typeMeta, relativeDueLabel } from '../utils/reminderDisplay';
import '../styles/dashboard-hero.css';

const BRACHY_HINT = ['bulldog', 'pug', 'boston', 'shih tzu', 'lhasa', 'boxer', 'pekin', 'frances', 'french'];

// Hemisferio sur: temporada de garrapatas/calor cae en primavera-verano.
function springSummerMonth() {
  const m = new Date().getMonth() + 1;
  return [9, 10, 11, 12, 1, 2, 3].includes(m);
}

const HEALTH_SECTION_KEYS = ['vaccinations', 'medications', 'appointments', 'symptoms', 'history'];

export default function DashboardPage() {
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);
  const isVet = useSelector(selectIsVet);
  const [dogs, setDogs] = useState([]);
  const [activeDogId, setActiveDogId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remindersPreview, setRemindersPreview] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    getDogs()
      .then(({ data }) => {
        setDogs(data.dogs);
        if (data.dogs.length > 0) setActiveDogId(data.dogs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getFullRemindersList()
      .then(({ data }) => {
        setRemindersPreview(data.reminders || []);
      })
      .catch(() => {
        setRemindersPreview([]);
      });
  }, []);
  const activeDog = dogs.find((d) => d.id === activeDogId);

  // Recordatorios scopeados al perro activo: la portada queda 100% coherente con
  // el perro elegido. "Ver todo" sigue mostrando todos los perros.
  const dogReminders = remindersPreview.filter((r) => r.petId === activeDogId);
  // Separamos lo atrasado (acción urgente) de lo que viene (foco a futuro).
  const overdueReminders = dogReminders.filter((r) => r.status === 'overdue');
  const upcomingReminders = dogReminders.filter((r) => r.status !== 'overdue').slice(0, 4);
  const now = new Date();
  const isPremium = (user?.effectiveTier ?? user?.tier) === 'premium';

  // Modal de opt-in de zona: solo si no dio consentimiento, es temporada relevante
  // y todavía hay perros. Aparece en momento de valor, sin insistir si lo descarta.
  const [showLocationModal, setShowLocationModal] = useState(false);
  useEffect(() => {
    if (loading) return;
    const hasConsent = Boolean(user?.locationConsentAt);
    if (!hasConsent && dogs.length > 0 && springSummerMonth() && !wasLocationPromptDismissed()) {
      setShowLocationModal(true);
    }
  }, [loading, dogs.length, user?.locationConsentAt]);

  const month = new Date().getMonth() + 1;
  const brachyActive = activeDog && BRACHY_HINT.some((b) => (activeDog.breed || '').toLowerCase().includes(b));
  const locationExampleKey = brachyActive && [12, 1, 2].includes(month) ? 'heat' : 'tick';

  // Hitos: celebra el primer pendiente del perro activo (una sola vez).
  const [milestone, setMilestone] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  useEffect(() => {
    if (!activeDogId) { setMilestone(null); return; }
    getMilestones(activeDogId)
      .then(({ data }) => {
        setReferralCode(data.referralCode || null);
        setMilestone((data.pending && data.pending[0]) || null);
      })
      .catch(() => setMilestone(null));
  }, [activeDogId]);

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <OfflineIndicator />

      {/* Top nav bar */}
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon">🐾</span>
          <span className="dashboard-brand-name">{t('appName')}</span>
        </div>
        <div className="dashboard-topbar-right">
          <ExploreMenu dogId={activeDogId} dogName={activeDog?.name} isPremium={isPremium} />
          <LanguageSwitcher />
          <UserMenu dogs={dogs} />
        </div>
      </header>

      <main className="dashboard-content">
        {dogs.length === 0 ? (
          /* Empty state */
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">{isVet ? '🏥' : '🐶'}</div>
            <h2>{isVet ? t('vetPanel.emptyTitle') : t('dashboard.addFirstDog')}</h2>
            <p>{isVet ? t('vetPanel.emptyDesc') : t('dashboard.addFirstDogDesc')}</p>
            <div className="dashboard-empty-actions">
              {isVet && (
                <Link to="/vet-portal" className="btn">{t('vetPanel.goToPanel')}</Link>
              )}
              <Link to="/dogs/new" className={`btn ${isVet ? 'btn-secondary' : ''}`}>
                {t('dashboard.createDogProfile')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Hero unificado: switcher (primero) + identidad + Health Score + "⋯" */}
            <DogContextHeader dogs={dogs} activeDogId={activeDogId} onSelect={setActiveDogId} />

            {!isPremium && dogs.length >= 1 && <UpgradeBanner />}

            {/* Zona HOY: el ritual de check-in (pregunta si falta; strip slim si ya está) */}
            {activeDog && (
              <section className="dash-zone" id="today">
                <h2 className="dash-section-label">{t('dashboard.zones.today')}</h2>
                <CheckinCard key={activeDog.id} dog={activeDog} />
              </section>
            )}

            {/* Zona LO QUE VIENE: recordatorios del perro activo */}
            <section className="dash-zone card today-card" id="upcoming">
              <div className="page-header" style={{ marginBottom: 8 }}>
                <h2>{t('remindersFullList.previewTitle')}</h2>
                <Link to="/dashboard/reminders/full">{t('common.viewAll')}</Link>
              </div>

              {/* Atrasados: una sola fila de alerta que invita a ponerse al día */}
              {overdueReminders.length > 0 && (
                <Link to="/dashboard/reminders/full" className="today-overdue">
                  <span className="today-overdue-icon" aria-hidden="true">⚠️</span>
                  <span className="today-overdue-text">
                    {overdueReminders.length === 1
                      ? t('dashboard.overdueOne')
                      : t('dashboard.overdueMany', { n: overdueReminders.length })}
                  </span>
                  <span className="today-overdue-cta">{t('dashboard.overdueCta')} →</span>
                </Link>
              )}

              {upcomingReminders.length > 0 ? (
                <ul className="today-list">
                  {upcomingReminders.map((r) => {
                    const meta = typeMeta(r.sourceType);
                    return (
                      <li key={r.id} className="today-item" style={{ '--today-accent': meta.accent }}>
                        <span className="today-item-icon" aria-hidden="true">{meta.icon}</span>
                        <div className="today-item-body">
                          <h3 className="today-item-title">{r.title}</h3>
                          <p className="today-item-meta">{r.petName}</p>
                        </div>
                        <span className="today-item-due">{relativeDueLabel(r.dueAt, now, t)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : overdueReminders.length === 0 ? (
                <p className="today-clear">{t('dashboard.todayClear')}</p>
              ) : null}
            </section>

            {/* Zona CUIDADO: tip preventivo + accesos a los registros de salud */}
            <section className="dash-zone dash-care" id="care">
              <h2 className="dash-section-label">{t('dashboard.zones.care')}</h2>
              <div className="dash-care-grid">
                {activeDog && <PreventiveCareCard dogId={activeDog.id} dogName={activeDog.name} />}
                <div className="health-sections" id="salud">
                  <h3 className="health-sections-title">{t('dashboard.healthRecords')}</h3>
                  <div className="health-pills">
                    {HEALTH_SECTION_KEYS.map((key) => (
                      <Link key={key} to={`/dogs/${activeDogId}/${key}`} className="health-pill">
                        <span className="health-pill-emoji" aria-hidden="true">
                          {key === 'vaccinations' && '💉'}
                          {key === 'medications' && '💊'}
                          {key === 'appointments' && '🏥'}
                          {key === 'symptoms' && '🩺'}
                          {key === 'history' && '📋'}
                        </span>
                        <span className="health-pill-label">{t(`dashboard.sections.${key}.label`)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </>
        )}
      </main>

      {/* Registro rápido: FAB en desktop, "+" central de la barra inferior en móvil.
          Ambos abren la misma hoja vía estado controlado. */}
      {activeDog && (
        <>
          <QuickActionsFab dog={activeDog} open={quickOpen} onOpenChange={setQuickOpen} />
          <BottomNav dogId={activeDogId} onQuickAdd={() => setQuickOpen(true)} />
        </>
      )}

      {showLocationModal && (
        <LocationConsentModal exampleKey={locationExampleKey} onClose={() => setShowLocationModal(false)} />
      )}

      {milestone && activeDog && (
        <MilestoneCelebration
          dog={activeDog}
          milestone={milestone}
          referralCode={referralCode}
          onClose={() => setMilestone(null)}
        />
      )}
    </div>
  );
}
