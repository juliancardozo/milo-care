import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDogs } from '../services/api';
import { selectCurrentUser } from '../store/authSlice';
import { selectOnboarding, configureOnboarding } from '../store/onboardingSlice';
import { useI18n } from '../i18n/I18nProvider';
import DogOnboardingPage from './DogOnboardingPage';
import SecondDogUpsell from '../components/SecondDogUpsell';

/**
 * Gate de /dogs/new:
 * - FREE con ≥1 perro → upsell premium personalizado (no arranca el onboarding).
 * - PREMIUM con ≥1 perro → onboarding SIN el paso "Tutor" (ya está cargado).
 * - Primer perro → onboarding completo.
 *
 * La configuración se dispara antes de montar el onboarding y sólo en un inicio
 * fresco (sin sesión activa), para no pisar un onboarding en progreso.
 */
export default function AddDogGate() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const onboarding = useSelector(selectOnboarding);
  const isPremium = (user?.effectiveTier ?? user?.tier) === 'premium';

  const [phase, setPhase] = useState('loading'); // loading | upsell | onboarding
  const [dogs, setDogs] = useState([]);

  useEffect(() => {
    let ignore = false;
    getDogs()
      .then(({ data }) => {
        if (ignore) return;
        const ds = data.dogs || [];
        setDogs(ds);

        if (!isPremium && ds.length >= 1) {
          setPhase('upsell');
          return;
        }
        // Configurar el flujo sólo si no hay una sesión en progreso.
        if (!onboarding.sessionId) {
          const additional = ds.length >= 1;
          const seed = additional && ds[0]
            ? { country: ds[0].countryProfile, city: ds[0].city, timezone: ds[0].timezone }
            : {};
          dispatch(configureOnboarding({ additional, owner: seed }));
        }
        setPhase('onboarding');
      })
      .catch(() => { if (!ignore) setPhase('onboarding'); });
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'loading') return <div className="page"><p>{t('common.loading')}</p></div>;
  if (phase === 'upsell') return <SecondDogUpsell dogs={dogs} />;
  return <DogOnboardingPage />;
}
