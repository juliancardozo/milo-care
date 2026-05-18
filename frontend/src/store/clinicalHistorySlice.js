import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  symptoms: [],
  consultations: [],
  vaccinations: [],
  medications: [],
  appointments: [],
  loading: false,
  error: null,
  selectedEventType: 'all', // 'all', 'symptoms', 'consultations', 'vaccinations', 'medications', 'appointments'
};

const clinicalHistorySlice = createSlice({
  name: 'clinicalHistory',
  initialState,
  reducers: {
    // Fetch
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Symptoms
    setSymptoms: (state, action) => {
      state.symptoms = action.payload;
    },
    addSymptomLocal: (state, action) => {
      state.symptoms.push(action.payload);
    },
    updateSymptomLocal: (state, action) => {
      const idx = state.symptoms.findIndex((s) => s._id === action.payload._id);
      if (idx >= 0) state.symptoms[idx] = action.payload;
    },
    deleteSymptomLocal: (state, action) => {
      state.symptoms = state.symptoms.filter((s) => s._id !== action.payload);
    },

    // Consultations
    setConsultations: (state, action) => {
      state.consultations = action.payload;
    },
    addConsultationLocal: (state, action) => {
      state.consultations.push(action.payload);
    },
    updateConsultationLocal: (state, action) => {
      const idx = state.consultations.findIndex((c) => c._id === action.payload._id);
      if (idx >= 0) state.consultations[idx] = action.payload;
    },
    deleteConsultationLocal: (state, action) => {
      state.consultations = state.consultations.filter((c) => c._id !== action.payload);
    },

    // Vaccinations
    setVaccinations: (state, action) => {
      state.vaccinations = action.payload;
    },

    // Medications
    setMedications: (state, action) => {
      state.medications = action.payload;
    },

    // Appointments
    setAppointments: (state, action) => {
      state.appointments = action.payload;
    },

    // Filter
    setSelectedEventType: (state, action) => {
      state.selectedEventType = action.payload;
    },

    // Reset
    resetClinicalHistory: () => initialState,
  },
});

export const {
  setLoading,
  setError,
  setSymptoms,
  addSymptomLocal,
  updateSymptomLocal,
  deleteSymptomLocal,
  setConsultations,
  addConsultationLocal,
  updateConsultationLocal,
  deleteConsultationLocal,
  setVaccinations,
  setMedications,
  setAppointments,
  setSelectedEventType,
  resetClinicalHistory,
} = clinicalHistorySlice.actions;

export default clinicalHistorySlice.reducer;

// Selectors
export const selectSymptoms = (state) => state.clinicalHistory.symptoms;
export const selectConsultations = (state) => state.clinicalHistory.consultations;
export const selectVaccinations = (state) => state.clinicalHistory.vaccinations;
export const selectMedications = (state) => state.clinicalHistory.medications;
export const selectAppointments = (state) => state.clinicalHistory.appointments;
export const selectLoading = (state) => state.clinicalHistory.loading;
export const selectError = (state) => state.clinicalHistory.error;
export const selectSelectedEventType = (state) => state.clinicalHistory.selectedEventType;

/**
 * Get all events merged and sorted by date (newest first)
 */
export const selectAllEvents = (state) => {
  const {
    symptoms = [],
    consultations = [],
    vaccinations = [],
    medications = [],
    appointments = [],
  } = state.clinicalHistory;

  const allEvents = [
    ...symptoms.map((s) => ({ ...s, type: 'symptom', date: s.dateObserved })),
    ...consultations.map((c) => ({ ...c, type: 'consultation', date: c.dateOfConsult })),
    ...vaccinations.map((v) => ({ ...v, type: 'vaccination', date: v.dateAdministered })),
    ...medications.map((m) => ({ ...m, type: 'medication', date: m.startDate })),
    ...appointments.map((a) => ({ ...a, type: 'appointment', date: a.appointmentDate })),
  ];

  return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const selectFilteredEvents = (state) => {
  const allEvents = selectAllEvents(state);
  const selectedType = selectSelectedEventType(state);

  if (selectedType === 'all') return allEvents;
  return allEvents.filter((e) => e.type === selectedType);
};
