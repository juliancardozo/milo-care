import api from './api';

/**
 * Fetch all clinical history events (vaccinations, medications, appointments, symptoms)
 * Unified endpoint that returns events grouped by type
 */
export const getClinicalHistory = (dogId) =>
  api.get(`/dogs/${dogId}/clinical-history`);

/**
 * Add symptom record
 */
export const addSymptom = (dogId, symptomData) =>
  api.post(`/dogs/${dogId}/symptoms`, symptomData);

/**
 * Update symptom record
 */
export const updateSymptom = (dogId, symptomId, updates) =>
  api.patch(`/dogs/${dogId}/symptoms/${symptomId}`, updates);

/**
 * Delete symptom record
 */
export const deleteSymptom = (dogId, symptomId) =>
  api.delete(`/dogs/${dogId}/symptoms/${symptomId}`);

/**
 * Add veterinary consultation record
 */
export const addConsultation = (dogId, consultationData) =>
  api.post(`/dogs/${dogId}/consultations`, consultationData);

/**
 * Get all consultations for a dog
 */
export const getConsultations = (dogId) =>
  api.get(`/dogs/${dogId}/consultations`);

/**
 * Update consultation
 */
export const updateConsultation = (dogId, consultId, updates) =>
  api.patch(`/dogs/${dogId}/consultations/${consultId}`, updates);

/**
 * Delete consultation
 */
export const deleteConsultation = (dogId, consultId) =>
  api.delete(`/dogs/${dogId}/consultations/${consultId}`);

/**
 * Get vaccine history for a dog
 */
export const getVaccinations = (dogId) =>
  api.get(`/dogs/${dogId}/vaccinations`);

/**
 * Get medication history for a dog
 */
export const getMedications = (dogId) =>
  api.get(`/dogs/${dogId}/medications`);

/**
 * Get appointments for a dog
 */
export const getAppointments = (dogId) =>
  api.get(`/dogs/${dogId}/appointments`);

/**
 * Get symptoms for a dog
 */
export const getSymptoms = (dogId) =>
  api.get(`/dogs/${dogId}/symptoms`);
