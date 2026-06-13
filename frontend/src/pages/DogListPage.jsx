import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { useSelector } from 'react-redux';
import { getDogs, deleteDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import { selectCurrentUser } from '../store/authSlice';
import '../styles/dog-list.css';

function DogAvatar({ dog }) {
  if (dog.photoUrl) return <img src={dog.photoUrl} alt={dog.name} className="doglist-avatar" />;
  return <div className="doglist-avatar-ph">{(dog.name || '?').charAt(0).toUpperCase()}</div>;
}

export default function DogListPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPremium = (user?.effectiveTier ?? user?.tier) === 'premium';
  const canAddDog = isPremium || dogs.length === 0;

  useEffect(() => {
    getDogs()
      .then(({ data }) => setDogs(data.dogs))
      .catch(() => setError(t('dogs.errors.load')))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleDelete(dogId, name) {
    if (!window.confirm(t('dogs.confirmDelete', { name }))) return;
    try {
      await deleteDog(dogId);
      setDogs((prev) => prev.filter((d) => d.id !== dogId));
    } catch {
      setError(t('dogs.errors.delete'));
    }
  }

  if (loading) return <div className="page"><p>{t('common.loading')}</p></div>;

  return (
    <div className="doglist-page">
      <BackLink to="/dashboard" />
      <div className="doglist-head">
        <h1>{t('dogs.yourDogs')}</h1>
        {canAddDog ? (
          <Link to={isPremium ? '/dogs/new' : (dogs.length === 0 ? '/dogs/new' : '/upgrade')} className="doglist-add">＋ {t('dogs.addDog')}</Link>
        ) : (
          <Link to="/upgrade" className="doglist-add" title={t('dogs.errors.tierLimitReached') || ''}>＋ {t('dogs.addDog')}</Link>
        )}
      </div>

      {error && <p className="server-error">{error}</p>}

      {dogs.length === 0 ? (
        <div className="doglist-empty">
          <div className="doglist-empty-emoji">🐶</div>
          <p>{t('dogs.noDogs')}</p>
          <Link to="/dogs/new" className="doglist-add">{t('dogs.addFirstDogLink')}</Link>
        </div>
      ) : (
        <div className="doglist-grid">
          {dogs.map((dog) => (
            <article key={dog.id} className="doglist-card">
              <div className="doglist-top">
                <DogAvatar dog={dog} />
                <div className="doglist-info">
                  <h2 className="doglist-name">{dog.name}</h2>
                  <div className="doglist-meta">
                    {dog.breed && <span className="doglist-chip">🐾 {dog.breed}</span>}
                    <span className="doglist-chip">🎂 {dog.ageDisplay ?? `${dog.ageYears} ${t('dogs.years')}`}</span>
                    {dog.sex && dog.sex !== 'unknown' && (
                      <span className="doglist-chip">{dog.sex === 'male' ? '♂' : '♀'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="doglist-actions">
                <button className="doglist-btn-primary" onClick={() => navigate(`/dogs/${dog.id}/vaccinations`)}>
                  {t('dogs.viewRecords')}
                </button>
                <button className="doglist-btn-ghost" onClick={() => navigate(`/dogs/${dog.id}/edit`)}>
                  ✏️ {t('dashboard.editProfile')}
                </button>
                <button className="doglist-btn-del" onClick={() => handleDelete(dog.id, dog.name)} aria-label={t('common.delete')}>
                  🗑
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
