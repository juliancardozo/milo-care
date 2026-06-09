import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getPublicDog } from '../services/publicApi';

function fmtDate(value, lang) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function Avatar({ dog }) {
  if (dog.photoUrl) {
    return <img src={dog.photoUrl} alt={dog.name} className="public-pet-photo" />;
  }
  return <div className="public-pet-photo public-pet-photo--placeholder">🐾</div>;
}

export default function PublicPetPage() {
  const { dogId } = useParams();
  const { t, language } = useI18n();
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPublicDog(dogId)
      .then(({ data }) => setDog(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [dogId]);

  if (loading) {
    return <div className="public-pet"><p className="public-pet-loading">{t('common.loading')}</p></div>;
  }

  if (notFound || !dog) {
    return (
      <div className="public-pet">
        <div className="public-pet-card">
          <div className="public-pet-photo public-pet-photo--placeholder">🐾</div>
          <h1>{t('publicPet.notFoundTitle')}</h1>
          <p>{t('publicPet.notFoundDesc')}</p>
        </div>
      </div>
    );
  }

  const nextVaccine = fmtDate(dog.nextVaccineDate, language);
  const nextDeworming = fmtDate(dog.nextDewormingDate, language);

  return (
    <div className="public-pet">
      <div className="public-pet-langbar">
        <LanguageSwitcher />
      </div>

      <div className="public-pet-card">
        <span className="public-pet-brand">🐾 {t('appName')}</span>
        <Avatar dog={dog} />
        <h1 className="public-pet-name">{dog.name}</h1>
        {dog.breed && <p className="public-pet-breed">{dog.breed}</p>}
        <p className="public-pet-lost">{t('publicPet.foundBanner')}</p>

        {/* Contacto: botones para llamar directamente */}
        <div className="public-pet-contacts">
          {dog.ownerPhone && (
            <a href={`tel:${dog.ownerPhone}`} className="btn btn-primary public-pet-call">
              📞 {t('publicPet.callOwner')}{dog.ownerName ? ` (${dog.ownerName})` : ''}
            </a>
          )}
          {dog.veterinarianPhone && (
            <a href={`tel:${dog.veterinarianPhone}`} className="btn public-pet-call">
              🏥 {t('publicPet.callVet')}{dog.veterinarianName ? ` (${dog.veterinarianName})` : ''}
            </a>
          )}
        </div>

        {/* Datos */}
        <dl className="public-pet-data">
          {dog.microchipId && (
            <div><dt>{t('publicPet.microchip')}</dt><dd>{dog.microchipId}</dd></div>
          )}
          {dog.ownerName && (
            <div><dt>{t('publicPet.owner')}</dt><dd>{dog.ownerName}</dd></div>
          )}
          {dog.veterinarianName && (
            <div><dt>{t('publicPet.vet')}</dt><dd>{dog.veterinarianName}</dd></div>
          )}
          {nextVaccine && (
            <div><dt>{t('publicPet.nextVaccine')}</dt><dd>{nextVaccine}</dd></div>
          )}
          {nextDeworming && (
            <div><dt>{t('publicPet.nextDeworming')}</dt><dd>{nextDeworming}</dd></div>
          )}
        </dl>
      </div>
    </div>
  );
}
