import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getDogs, deleteDog } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import { selectCurrentUser } from '../store/authSlice';

export default function DogListPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canAddDog = user?.tier === 'premium' || dogs.length === 0;

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
    <div className="page">
      <header className="page-header">
        <h1>{t('dogs.yourDogs')}</h1>
        {canAddDog ? (
          <Link to="/dogs/new" className="btn-primary">{t('dogs.addDog')}</Link>
        ) : (
          <button disabled className="btn-primary" title={t('dogs.errors.tierLimitReached') || 'Free accounts limited to 1 dog'}>
            {t('dogs.addDog')}
          </button>
        )}
      </header>
      {error && <p className="server-error">{error}</p>}
      {dogs.length === 0 ? (
        <p>{t('dogs.noDogs')} <Link to="/dogs/new">{t('dogs.addFirstDogLink')}</Link></p>
      ) : (
        <ul className="dog-list">
          {dogs.map((dog) => (
            <li key={dog.id} className="dog-list-item">
              {dog.photoUrl && <img src={dog.photoUrl} alt={dog.name} className="dog-photo" />}
              <div className="dog-info">
                <strong>{dog.name}</strong>
                <span>{dog.breed}</span>
                <span>{dog.ageYears} {t('dogs.years')}</span>
              </div>
              <div className="dog-actions">
                <button onClick={() => navigate(`/dogs/${dog.id}/vaccinations`)}>{t('dogs.viewRecords')}</button>
                <button onClick={() => handleDelete(dog.id, dog.name)} className="btn-danger">{t('common.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/dashboard">{t('common.backToDashboard')}</Link>
    </div>
  );
}
