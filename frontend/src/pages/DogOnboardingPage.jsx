import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectOnboarding,
  setSessionId,
  nextStep,
  previousStep,
  updateStepValues,
  setErrors,
  setWarnings,
  setSummary,
  setLoading,
  hydrateFromDraft,
  setConfirmedDogId,
  resetOnboarding,
} from '../store/onboardingSlice';
import {
  startOnboarding,
  saveOnboardingStep,
  getOnboardingDraft,
  getOnboardingSummary,
  confirmOnboarding,
} from '../services/onboardingApi';
import { validateStep } from '../services/validationRules';
import StepIndicator from '../components/onboarding/StepIndicator';
import LivePetCard from '../components/onboarding/LivePetCard';
import OwnerProfileForm from '../components/onboarding/OwnerProfileForm';
import DogBasicInfoForm from '../components/onboarding/DogBasicInfoForm';
import ClinicalHistoryForm from '../components/onboarding/ClinicalHistoryForm';
import LifestyleForm from '../components/onboarding/LifestyleForm';
import VaccinationRecordForm from '../components/onboarding/VaccinationRecordForm';
import DewormingHistoryForm from '../components/onboarding/DewormingHistoryForm';
import RedFlagAlert from '../components/onboarding/RedFlagAlert';
import SummaryStep from '../components/onboarding/SummaryStep';
import '../styles/onboarding.css';

// Etiqueta por clave de paso. Las etiquetas mostradas se derivan de los pasos
// activos (que pueden excluir "Tutor" al sumar un segundo perro).
const STEP_LABEL_MAP = {
  owner: 'Tutor',
  'dog-basic': 'Perro',
  'clinical-history': 'Clínico',
  lifestyle: 'Estilo de vida',
  vaccines: 'Vacunas',
  deworming: 'Desparasitación',
  summary: 'Resumen',
};

// Encabezado cálido por paso (emoji + título + bajada).
const STEP_META = {
  owner: { emoji: '👋', title: 'Tus datos', sub: 'Quién cuida a este compañero.' },
  'dog-basic': { emoji: '🐶', title: 'Contanos de tu perro', sub: 'Lo básico para armar su ficha y su calendario.' },
  'clinical-history': { emoji: '🩺', title: 'Su salud', sub: 'Antecedentes que nos ayudan a cuidarlo mejor.' },
  lifestyle: { emoji: '🌳', title: 'Su estilo de vida', sub: 'Cómo vive nos deja anticipar riesgos.' },
  vaccines: { emoji: '💉', title: 'Sus vacunas', sub: 'Cargá lo que ya tiene aplicado. Podés saltearlo.' },
  deworming: { emoji: '🪱', title: 'Desparasitación', sub: 'Los antiparasitarios que ya recibió.' },
  summary: { emoji: '✅', title: '¡Todo listo!', sub: 'Revisá y confirmá para crear su calendario.' },
};

// Títulos que usan el nombre del perro una vez que lo conocemos (hiperpersonalización).
const NAMED_TITLE = {
  'clinical-history': (n) => `La salud de ${n}`,
  lifestyle: (n) => `¿Cómo vive ${n}?`,
  vaccines: (n) => `Las vacunas de ${n}`,
  deworming: (n) => `La desparasitación de ${n}`,
  summary: (n) => `¡${n} ya está listo!`,
};

function metaFor(stepKey, dogName) {
  const base = STEP_META[stepKey] || { emoji: '🐾', title: 'Onboarding', sub: '' };
  if (dogName && NAMED_TITLE[stepKey]) {
    return { ...base, title: NAMED_TITLE[stepKey](dogName) };
  }
  return base;
}

export default function DogOnboardingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const onboarding = useSelector(selectOnboarding);
  const [serverError, setServerError] = useState('');

  const currentStepKey = onboarding.steps[onboarding.currentStepIndex];

  const currentValues = useMemo(() => {
    if (currentStepKey === 'owner') return onboarding.values.owner;
    if (currentStepKey === 'dog-basic') return onboarding.values.dog;
    if (currentStepKey === 'clinical-history') return onboarding.values.clinical;
    if (currentStepKey === 'lifestyle') return onboarding.values.lifestyle;
    if (currentStepKey === 'vaccines') return onboarding.values.vaccines;
    if (currentStepKey === 'deworming') return onboarding.values.deworming;
    return onboarding.values;
  }, [currentStepKey, onboarding.values]);

  useEffect(() => {
    // Always call startOnboarding on mount to validate the session against the
    // server. A stale sessionId in localStorage (e.g. from a confirmed session
    // whose MongoDB document was deleted) would otherwise cause every subsequent
    // step to return 404 "Onboarding session not found."
    // The server returns the existing draft session or creates a fresh one, so
    // calling this on every mount is safe for mid-flow page refreshes too.
    let ignore = false;

    async function bootstrap() {
      try {
        dispatch(setLoading(true));
        const { data } = await startOnboarding(onboarding.values.owner);
        if (!ignore) {
          dispatch(setSessionId(data.sessionId));
          // Only hydrate form values when the server confirmed we are resuming
          // an existing in-progress draft (data.resumed === true).
          if (data.resumed) {
            const draft = await getOnboardingDraft(data.sessionId);
            dispatch(hydrateFromDraft(draft.data));
          }
          dispatch(setLoading(false));
        }
      } catch (err) {
        if (!ignore) {
          setServerError(err.response?.data?.message || 'No se pudo iniciar el onboarding.');
          dispatch(setLoading(false));
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Garantiza una sesión válida: si por alguna razón no hay sessionId (sesión no
  // iniciada o pisada), crea una al vuelo. Evita llamadas a /onboarding/null/...
  async function ensureSessionId() {
    if (onboarding.sessionId) return onboarding.sessionId;
    const { data } = await startOnboarding(onboarding.values.owner);
    dispatch(setSessionId(data.sessionId));
    return data.sessionId;
  }

  async function persistStep(stepKey, values, sessionId) {
    // Filter out incomplete vaccine/deworming records
    let finalValues = values;
    if (stepKey === 'vaccines' && Array.isArray(values)) {
      finalValues = values.filter(v => v.vaccineName && v.dateAdministered);
    } else if (stepKey === 'deworming' && Array.isArray(values)) {
      finalValues = values.filter(v => v.productName && v.dateAdministered);
    }

    const payloadByStep = {
      owner: values,
      'dog-basic': values,
      'clinical-history': values,
      lifestyle: values,
      vaccines: { vaccines: finalValues },
      deworming: { deworming: finalValues },
    };

    const payload = payloadByStep[stepKey] || values;
    const { data } = await saveOnboardingStep(sessionId, stepKey, payload);
    dispatch(setWarnings(data.warnings || []));
  }

  async function handleNext() {
    setServerError('');

    if (currentStepKey === 'summary') {
      if (!onboarding.sessionId) {
        // Sin sesión no se puede confirmar: reiniciar para arrancar limpio.
        dispatch(resetOnboarding());
        setServerError('Tu sesión expiró. Por favor, empezá el onboarding de nuevo.');
        return;
      }
      try {
        dispatch(setLoading(true));
        const { data } = await confirmOnboarding(onboarding.sessionId, {
          disclaimerConfirmed: true,
          allowPendingVetValidation: true,
        });
        // Capture summary before reset so the summary page can read it from nav state
        const summarySnapshot = onboarding.summary;
        dispatch(setConfirmedDogId(data.dog.id));
        dispatch(resetOnboarding());
        navigate('/dogs/onboarding/summary', { state: { summary: summarySnapshot, dogId: data.dog.id } });
      } catch (err) {
        setServerError(err.response?.data?.message || 'No se pudo confirmar el onboarding.');
      } finally {
        dispatch(setLoading(false));
      }
      return;
    }

    const clientErrors = validateStep(currentStepKey, currentValues);
    dispatch(setErrors(clientErrors));
    if (Object.keys(clientErrors).length > 0) return;

    try {
      dispatch(setLoading(true));
      const sessionId = await ensureSessionId();
      await persistStep(currentStepKey, currentValues, sessionId);

      if (onboarding.currentStepIndex === onboarding.steps.length - 2) {
        const { data } = await getOnboardingSummary(sessionId);
        dispatch(setSummary(data));
      }

      dispatch(nextStep());
    } catch (err) {
      // Stale session — reset state so bootstrap creates a fresh one on next render
      if (err.response?.status === 404) {
        dispatch(resetOnboarding());
        setServerError('Tu sesión expiró. Por favor, empezá el onboarding de nuevo.');
      } else {
        setServerError(err.response?.data?.message || 'No se pudo guardar este paso.');
      }
    } finally {
      dispatch(setLoading(false));
    }
  }

  function handleBack() {
    dispatch(setErrors({}));
    dispatch(previousStep());
  }

  function renderStep() {
    if (currentStepKey === 'owner') {
      return (
        <OwnerProfileForm
          value={onboarding.values.owner}
          onChange={(values) => dispatch(updateStepValues({ key: 'owner', values }))}
          errors={onboarding.errors}
        />
      );
    }

    if (currentStepKey === 'dog-basic') {
      return (
        <DogBasicInfoForm
          value={onboarding.values.dog}
          onChange={(values) => dispatch(updateStepValues({ key: 'dog', values }))}
          errors={onboarding.errors}
        />
      );
    }

    if (currentStepKey === 'clinical-history') {
      return (
        <ClinicalHistoryForm
          value={onboarding.values.clinical}
          onChange={(values) => dispatch(updateStepValues({ key: 'clinical', values }))}
          errors={onboarding.errors}
        />
      );
    }

    if (currentStepKey === 'lifestyle') {
      return (
        <LifestyleForm
          value={onboarding.values.lifestyle}
          onChange={(values) => dispatch(updateStepValues({ key: 'lifestyle', values }))}
        />
      );
    }

    if (currentStepKey === 'vaccines') {
      return (
        <VaccinationRecordForm
          value={onboarding.values.vaccines}
          onChange={(values) => dispatch(updateStepValues({ key: 'vaccines', values }))}
        />
      );
    }

    if (currentStepKey === 'deworming') {
      return (
        <DewormingHistoryForm
          value={onboarding.values.deworming}
          onChange={(values) => dispatch(updateStepValues({ key: 'deworming', values }))}
        />
      );
    }

    return <SummaryStep values={onboarding.values} summary={onboarding.summary} />;
  }

  const findings = onboarding.summary?.redFlags || [];
  const dogName = (onboarding.values.dog?.name || '').trim();
  const meta = metaFor(currentStepKey, dogName);
  const isLast = currentStepKey === 'summary';
  // La ficha en vivo aparece una vez que el perro tiene nombre, y acompaña el resto del flujo.
  const showLiveCard = Boolean(dogName) && currentStepKey !== 'owner';

  return (
    <div className="onb-page">
      <div className="onb-hero">
        <span className="onb-hero-icon" aria-hidden="true">{meta.emoji}</span>
        <div>
          <h1>{meta.title}</h1>
          {meta.sub && <p>{meta.sub}</p>}
        </div>
      </div>

      <StepIndicator
        currentStepIndex={onboarding.currentStepIndex}
        totalSteps={onboarding.steps.length}
        labels={onboarding.steps.map((k) => STEP_LABEL_MAP[k] || k)}
      />

      {showLiveCard && <LivePetCard dog={onboarding.values.dog} />}

      <RedFlagAlert findings={findings} />

      {serverError ? <p className="server-error">{serverError}</p> : null}
      {onboarding.warnings?.length ? (
        <section className="onb-warnings">
          <h2>⚠ Tené en cuenta</h2>
          <ul>
            {onboarding.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {renderStep()}

      <div className="onb-nav">
        {onboarding.currentStepIndex > 0 && (
          <button type="button" className="onb-back" onClick={handleBack} disabled={onboarding.loading}>
            ← Atrás
          </button>
        )}
        <button type="button" className="onb-next" onClick={handleNext} disabled={onboarding.loading}>
          {onboarding.loading
            ? 'Guardando…'
            : isLast
              ? '✨ Confirmar y crear el calendario'
              : 'Continuar →'}
        </button>
      </div>

      <p className="onb-disclaimer">
        Esta información es educativa y no reemplaza la consulta con un veterinario licenciado.
        Las recomendaciones pueden variar según el país, estado de salud y criterios profesionales.
      </p>
    </div>
  );
}
