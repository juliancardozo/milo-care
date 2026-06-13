import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { getDogs, getFullRemindersList } from '../services/api';
import OfflineIndicator from '../components/OfflineIndicator';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserMenu from '../components/UserMenu';
import UpgradeBanner from '../components/UpgradeBanner';
import AddToWalletButton from '../components/AddToWalletButton';
import CheckinCard from '../components/checkin/CheckinCard';
import HealthScoreCard from '../components/HealthScoreCard';
import QuickActionsFab from '../components/QuickActionsFab';
import BottomNav from '../components/BottomNav';
import ExploreMenu from '../components/ExploreMenu';
import LocationConsentModal, { wasLocationPromptDismissed } from '../components/LocationConsentModal';
import MilestoneCelebration from '../components/MilestoneCelebration';
import { getMilestones } from '../services/milestoneApi';
import { useI18n } from '../i18n/I18nProvider';

const BRACHY_HINT = ['bulldog', 'pug', 'boston', 'shih tzu', 'lhasa', 'boxer', 'pekin', 'frances', 'french'];

// Hemisferio sur: temporada de garrapatas/calor cae en primavera-verano.
function springSummerMonth() {
  const m = new Date().getMonth() + 1;
  return [9, 10, 11, 12, 1, 2, 3].includes(m);
}

const HEALTH_SECTION_KEYS = ['vaccinations', 'medications', 'appointments', 'symptoms', 'history'];

function DogAvatar({ dog }) {
  if (dog.photoUrl) {
    return <img src={dog.photoUrl} alt={dog.name} className="dog-avatar-img" />;
  }
  return (
    <div className="dog-avatar-placeholder">
      {dog.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);
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
        setRemindersPreview((data.reminders || []).slice(0, 5));
      })
      .catch(() => {
        setRemindersPreview([]);
      });
  }, []);
  const activeDog = dogs.find((d) => d.id === activeDogId);
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
            <div className="dashboard-empty-icon">🐶</div>
            <h2>{t('dashboard.addFirstDog')}</h2>
            <p>{t('dashboard.addFirstDogDesc')}</p>
            <Link to="/dogs/new" className="btn">{t('dashboard.createDogProfile')}</Link>
          </div>
        ) : (
          <>
            {/* Check-in diario: ritual de 10 segundos, arriba de todo */}
            {activeDog && <CheckinCard key={activeDog.id} dog={activeDog} />}

            {/* Health Score: el "por qué volver" — estado de salud + próxima acción */}
            {activeDog && <HealthScoreCard dogId={activeDog.id} dogName={activeDog.name} />}

            {!isPremium && dogs.length >= 1 && <UpgradeBanner />}

            {/* Dog switcher tabs */}
            {dogs.length > 1 && (
              <nav className="dog-tabs">
                {dogs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDogId(d.id)}
                    className={`dog-tab ${d.id === activeDogId ? 'active' : ''}`}
                  >
                    {d.name}
                  </button>
                ))}
              </nav>
            )}

            {/* Dog profile card (slim) */}
            {activeDog && (
              <div className="dog-profile-card">
                <DogAvatar dog={activeDog} />
                <div className="dog-profile-info">
                  <h1 className="dog-profile-name">{activeDog.name}</h1>
                  <p className="dog-profile-meta">{activeDog.breed}</p>
                  <p className="dog-profile-age">
                    {activeDog.ageDisplay ?? `${activeDog.ageYears} ${t('dashboard.yearsOld')}`}
                  </p>
                </div>
                <Link to={`/dogs/${activeDog.id}/edit`} className="dog-profile-edit">{t('dashboard.editProfile')}</Link>
                <AddToWalletButton dogId={activeDog.id} className="dog-profile-wallet" />
              </div>
            )}

            {/* Zona 2 — "Lo de hoy": el único foco accionable de la pantalla */}
            <section className="card today-card" id="today">
              <div className="page-header" style={{ marginBottom: 8 }}>
                <h2>{t('remindersFullList.previewTitle')}</h2>
                <Link to="/dashboard/reminders/full">{t('common.viewAll')}</Link>
              </div>
              {remindersPreview.length === 0 ? (
                <p className="today-clear">{t('dashboard.todayClear')}</p>
              ) : (
                <ul className="record-list">
                  {remindersPreview.map((r) => (
                    <li key={r.id} className="record-item">
                      <div className="record-info">
                        <h3>{r.title}</h3>
                        <p>{r.petName}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Zona 3 — Salud: navegación compacta (no compite por atención) */}
            <section className="health-sections" id="salud">
              <h2 className="health-sections-title">{t('dashboard.healthRecords')}</h2>
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
