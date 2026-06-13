import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'milocare.onboarding';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Validate that arrays are actually arrays (fix corrupted state)
    if (parsed.values && parsed.values.vaccines && !Array.isArray(parsed.values.vaccines)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.values && parsed.values.deworming && !Array.isArray(parsed.values.deworming)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    const { loading: _loading, ...stateToPersist } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  } catch {
    // Ignore persistence errors.
  }
}

const initialState = (() => {
  const persisted = loadPersistedState();
  const base = persisted || {
    sessionId: null,
    currentStepIndex: 0,
    steps: ['owner', 'dog-basic', 'clinical-history', 'lifestyle', 'vaccines', 'deworming', 'summary'],
    values: {
      owner: {
        name: '',
        email: '',
        phone: '',
        country: 'AR',
        city: '',
        timezone: '',
        disclaimerAccepted: false,
      },
      dog: {
        name: '',
        photoUrl: '',
        breed: '',
        size: 'medium',
        sex: 'unknown',
        neutered: false,
        weightKg: '',
        birthDate: '',
        birthDateConfidence: 'exact',
        estimatedAgeMonths: '',
        microchipId: '',
      },
      clinical: {
        hasVeterinarian: false,
        veterinarianName: '',
        allergies: [],
        conditions: [],
        currentMedications: [],
        previousVaccineReactions: '',
        recentSymptoms: {
          hasVomiting: false,
          hasDiarrhea: false,
          hasCough: false,
          hasSeizures: false,
          hasDermatitis: false,
          hasLimping: false,
          hasAppetiteLoss: false,
          hasBreathingDifficulty: false,
          otherSymptoms: '',
        },
      },
      lifestyle: {
        livesIndoors: true,
        dogParkAttendance: false,
        daycare: false,
        ruralOrVisitsRural: false,
        rawDiet: false,
        contactWithRodents: false,
        standsWater: false,
        cohabitsWithDogs: false,
        groomer: false,
      },
      vaccines: [],
      deworming: [],
    },
    warnings: [],
    errors: {},
    loading: false,
    summary: null,
    confirmedDogId: null,
  };
  
  // Ensure vaccines and deworming are always arrays (fix corrupted persisted state)
  if (!Array.isArray(base.values.vaccines)) {
    base.values.vaccines = [];
  }
  if (!Array.isArray(base.values.deworming)) {
    base.values.deworming = [];
  }
  
  return { ...base, loading: false };
})();

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setSessionId(state, action) {
      state.sessionId = action.payload;
      persistState(state);
    },
    setCurrentStepIndex(state, action) {
      state.currentStepIndex = action.payload;
      persistState(state);
    },
    nextStep(state) {
      const max = state.steps.length - 1;
      state.currentStepIndex = Math.min(state.currentStepIndex + 1, max);
      persistState(state);
    },
    previousStep(state) {
      state.currentStepIndex = Math.max(state.currentStepIndex - 1, 0);
      persistState(state);
    },
    updateStepValues(state, action) {
      const { key, values } = action.payload;
      // For arrays (vaccines, deworming), replace entirely instead of spreading
      if (Array.isArray(state.values[key])) {
        state.values[key] = Array.isArray(values) ? values : state.values[key];
      } else {
        // For objects, merge with spread
        state.values[key] = {
          ...state.values[key],
          ...values,
        };
      }
      persistState(state);
    },
    setWarnings(state, action) {
      state.warnings = action.payload || [];
      persistState(state);
    },
    setErrors(state, action) {
      state.errors = action.payload || {};
      persistState(state);
    },
    setSummary(state, action) {
      state.summary = action.payload || null;
      persistState(state);
    },
    setLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setConfirmedDogId(state, action) {
      state.confirmedDogId = action.payload || null;
      persistState(state);
    },
    hydrateFromDraft(state, action) {
      const draft = action.payload || {};
      state.values.owner = {
        ...state.values.owner,
        ...(draft.owner || {}),
      };
      state.values.dog = {
        ...state.values.dog,
        ...(draft.dog || {}),
        birthDate: draft.dog?.birthDate ? String(draft.dog.birthDate).slice(0, 10) : state.values.dog.birthDate,
      };
      state.values.clinical = {
        ...state.values.clinical,
        ...(draft.clinical || {}),
      };
      state.values.lifestyle = {
        ...state.values.lifestyle,
        ...(draft.lifestyle || {}),
      };
      // Filter incomplete vaccine records
      if (Array.isArray(draft.vaccines)) {
        state.values.vaccines = draft.vaccines.filter(v => v.vaccineName && v.dateAdministered);
      }
      // Filter incomplete deworming records
      if (Array.isArray(draft.deworming)) {
        state.values.deworming = draft.deworming.filter(v => v.productName && v.dateAdministered);
      }
      persistState(state);
    },
    resetOnboarding(state) {
      Object.assign(state, {
        ...initialState,
        sessionId: null,
        currentStepIndex: 0,
        summary: null,
        confirmedDogId: null,
      });
      persistState(state);
    },
    // Configura el flujo para un perro nuevo. `additional` (segundo+ perro) omite el
    // paso "Tutor": el tutor ya está cargado del primer perro. Sólo debe llamarse en
    // un inicio fresco (sin sesión activa) para no pisar un onboarding en progreso.
    configureOnboarding(state, action) {
      const { additional, owner } = action.payload || {};
      state.steps = additional
        ? ['dog-basic', 'clinical-history', 'lifestyle', 'vaccines', 'deworming', 'summary']
        : ['owner', 'dog-basic', 'clinical-history', 'lifestyle', 'vaccines', 'deworming', 'summary'];
      state.currentStepIndex = 0;
      state.errors = {};
      if (additional) {
        state.values.owner = {
          ...state.values.owner,
          ...(owner || {}),
          disclaimerAccepted: true,
        };
      }
      persistState(state);
    },
  },
});

export const {
  setSessionId,
  setCurrentStepIndex,
  nextStep,
  previousStep,
  updateStepValues,
  setWarnings,
  setErrors,
  setSummary,
  setLoading,
  setConfirmedDogId,
  hydrateFromDraft,
  resetOnboarding,
  configureOnboarding,
} = onboardingSlice.actions;

export const selectOnboarding = (state) => state.onboarding;

export default onboardingSlice.reducer;
