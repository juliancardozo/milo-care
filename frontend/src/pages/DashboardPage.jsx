import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { getDogs, getFullRemindersList } from '../services/api';
import OfflineIndicator from '../components/OfflineIndicator';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserMenu from '../components/UserMenu';
import { useI18n } from '../i18n/I18nProvider';

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

  useEffect(() => {
    getDogs()
      .then(({ data }) => {
        setDogs(data.dogs);
        if (data.dogs.length > 0) setActiveDogId(data.dogs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  getFullRemindersList()
      .then(({ data }) => {
        setRemindersPreview((data.reminders || []).slice(0, 5));
      })
      .catch(() => {
        setRemindersPreview([]);
      });
  const activeDog = dogs.find((d) => d.id === activeDogId);

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

            {/* Dog profile card */}
            {activeDog && (
              <div className="dog-profile-card">
                <DogAvatar dog={activeDog} />
                <div className="dog-profile-info">
                  <h1 className="dog-profile-name">{activeDog.name}</h1>
                  <p className="dog-profile-meta">{activeDog.breed}</p>
                  <p className="dog-profile-age">
                    {activeDog.ageYears} {t('dashboard.yearsOld')}
                  </p>
                </div>
                <Link to={`/dogs/${activeDog.id}/edit`} className="dog-profile-edit">{t('dashboard.editProfile')}</Link>
              </div>
            )}

            {/* Health sections grid */}
            <section className="health-sections">
              <h2 className="health-sections-title">{t('dashboard.healthRecords')}</h2>
              <div className="health-grid">
                {HEALTH_SECTION_KEYS.map((key) => (
                  <Link
                    key={key}
                    to={`/dogs/${activeDogId}/${key}`}
                    className="health-card"
                  >
                    <span className="health-card-emoji">
                      {key === 'vaccinations' && '💉'}
                      {key === 'medications' && '💊'}
                      {key === 'appointments' && '🏥'}
                      {key === 'symptoms' && '🩺'}
                      {key === 'history' && '📋'}
                    </span>
                    <span className="health-card-label">{t(`dashboard.sections.${key}.label`)}</span>
                    <span className="health-card-desc">{t(`dashboard.sections.${key}.desc`)}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick links */}
            <section className="card" style={{ marginTop: 16 }}>
              <div className="page-header" style={{ marginBottom: 8 }}>
                <h2>{t('remindersFullList.previewTitle')}</h2>
                <Link to="/dashboard/reminders/full">{t('common.viewAll')}</Link>
              </div>
              {remindersPreview.length === 0 ? (
                <p className="list-empty">{t('remindersFullList.empty')}</p>
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

            <section className="dashboard-footer-links">
              {user?.tier === 'premium' || dogs.length === 0 ? (
                <Link to="/dogs/new" className="footer-link">{t('dashboard.addAnotherDog')}</Link>
              ) : (
                <button disabled className="footer-link" style={{ cursor: 'not-allowed', opacity: 0.5 }} title={t('dogs.errors.tierLimitReached') || 'Free accounts limited to 1 dog'}>
                  {t('dashboard.addAnotherDog')}
                </button>
              )}
              <Link to="/settings/notifications" className="footer-link">{t('dashboard.notificationSettings')}</Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
