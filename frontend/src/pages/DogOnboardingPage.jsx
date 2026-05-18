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
import DisclosureWarning from '../components/onboarding/DisclosureWarning';
import OwnerProfileForm from '../components/onboarding/OwnerProfileForm';
import DogBasicInfoForm from '../components/onboarding/DogBasicInfoForm';
import ClinicalHistoryForm from '../components/onboarding/ClinicalHistoryForm';
import LifestyleForm from '../components/onboarding/LifestyleForm';
import VaccinationRecordForm from '../components/onboarding/VaccinationRecordForm';
import DewormingHistoryForm from '../components/onboarding/DewormingHistoryForm';
import RedFlagAlert from '../components/onboarding/RedFlagAlert';
import SummaryStep from '../components/onboarding/SummaryStep';

const STEP_LABELS = [
  'Tutor',
  'Perro',
  'Clínico',
  'Estilo de vida',
  'Vacunas',
  'Desparasitación',
  'Resumen',
];

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

  async function persistStep(stepKey, values) {
    if (!onboarding.sessionId) return;

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
    const { data } = await saveOnboardingStep(onboarding.sessionId, stepKey, payload);
    dispatch(setWarnings(data.warnings || []));
  }

  async function handleNext() {
    setServerError('');

    if (currentStepKey === 'summary') {
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
      await persistStep(currentStepKey, currentValues);

      if (onboarding.currentStepIndex === onboarding.steps.length - 2) {
        const { data } = await getOnboardingSummary(onboarding.sessionId);
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

  return (
    <div className="page">
      <h1>Onboarding de perros</h1>

      <StepIndicator
        currentStepIndex={onboarding.currentStepIndex}
        totalSteps={onboarding.steps.length}
        labels={STEP_LABELS}
      />

      <DisclosureWarning />
      <RedFlagAlert findings={findings} />

      {serverError ? <p className="server-error">{serverError}</p> : null}
      {onboarding.warnings?.length ? (
        <section className="card">
          <h2>Advertencias</h2>
          <ul>
            {onboarding.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {renderStep()}

      <div className="form-actions">
        <button type="button" onClick={handleBack} disabled={onboarding.currentStepIndex === 0 || onboarding.loading}>
          Atrás
        </button>
        <button type="button" onClick={handleNext} disabled={onboarding.loading}>
          {onboarding.loading
            ? 'Guardando...'
            : currentStepKey === 'summary'
              ? 'Confirmar y crear calendario'
              : 'Guardar y continuar'}
        </button>
      </div>
    </div>
  );
}
