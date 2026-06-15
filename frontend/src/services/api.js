import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const requestMagicLink = (email) => api.post('/auth/magic-link', { email });
export const magicLogin = (data) => api.post('/auth/magic-login', data);
export const deleteAccount = () => api.delete('/auth/me');
export const updateProfile = (data) => api.patch('/auth/me/profile', data);
export const updateNotificationPreferences = (data) => api.patch('/auth/me/notifications', data);
export const updateReminderWindowPreference = (data) => api.patch('/user/preferences/reminderWindow', data);
export const updateLocation = (data) => api.patch('/user/location', data);
export const deleteLocation = () => api.delete('/user/location');

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const updateAdminUser = (id, data) => api.patch(`/admin/users/${id}`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);
export const getAdminLeads = (params) => api.get('/admin/leads', { params });
export const previewAdminEmail = (type) => `/api/admin/email/preview/${type}`;
export const sendAdminTestEmail = (type) => api.post('/admin/email/test', { type });

// ── Vaccine catalog ───────────────────────────────────────────────────────────

export const getVaccineCatalog = (country = 'AR') => api.get('/vaccines/catalog', { params: { country } });
export const getAppointmentCatalog = () => api.get('/vaccines/appointments/catalog');

// ── Dogs ─────────────────────────────────────────────────────────────────────

export const getDogs = () => api.get('/dogs');
export const getDog = (dogId) => api.get(`/dogs/${dogId}`);
export const getHealthScore = (dogId) => api.get(`/dogs/${dogId}/health-score`);

// Compartir expediente con el veterinario (link tokenizado de solo lectura)
export const getVetShare = (dogId) => api.get(`/dogs/${dogId}/vet-share`);
export const createVetShare = (dogId) => api.post(`/dogs/${dogId}/vet-share`);
export const revokeVetShare = (dogId) => api.delete(`/dogs/${dogId}/vet-share`);
export const getVetRecord = (token) => api.get(`/vet/${token}`);
export const validateVetEvent = (token, payload) => api.post(`/vet/${token}/validate`, payload);

// Co-tutores (Premium): gestión por el dueño + aceptación por invitación.
export const getCoTutors = (dogId) => api.get(`/dogs/${dogId}/cotutores`);
export const inviteCoTutor = (dogId, email) => api.post(`/dogs/${dogId}/cotutores`, { email });
export const revokeCoTutor = (dogId, userId) => api.delete(`/dogs/${dogId}/cotutores/${userId}`);
export const revokeCoTutorInvite = (dogId, email) => api.delete(`/dogs/${dogId}/cotutores`, { params: { email } });
export const peekInvite = (token) => api.get(`/cotutores/${token}`);
export const acceptInvite = (token) => api.post(`/cotutores/${token}/accept`);
export const createDog = (data) => api.post('/dogs', data);
export const updateDog = (dogId, data) => api.patch(`/dogs/${dogId}`, data);
export const deleteDog = (dogId) => api.delete(`/dogs/${dogId}`);

// ── Vaccinations ─────────────────────────────────────────────────────────────

export const getVaccinations = (dogId) => api.get(`/dogs/${dogId}/vaccinations`);
export const createVaccination = (dogId, data) => api.post(`/dogs/${dogId}/vaccinations`, data);
export const updateVaccination = (dogId, vacId, data) => api.patch(`/dogs/${dogId}/vaccinations/${vacId}`, data);
export const deleteVaccination = (dogId, vacId) => api.delete(`/dogs/${dogId}/vaccinations/${vacId}`);

// ── Medications ───────────────────────────────────────────────────────────────

export const getMedications = (dogId, params) => api.get(`/dogs/${dogId}/medications`, { params });
export const createMedication = (dogId, data) => api.post(`/dogs/${dogId}/medications`, data);
export const updateMedication = (dogId, medId, data) => api.patch(`/dogs/${dogId}/medications/${medId}`, data);
export const deleteMedication = (dogId, medId) => api.delete(`/dogs/${dogId}/medications/${medId}`);

// ── Appointments ──────────────────────────────────────────────────────────────

export const getAppointments = (dogId) => api.get(`/dogs/${dogId}/appointments`);
export const createAppointment = (dogId, data) => api.post(`/dogs/${dogId}/appointments`, data);
export const updateAppointment = (dogId, apptId, data) => api.patch(`/dogs/${dogId}/appointments/${apptId}`, data);
export const deleteAppointment = (dogId, apptId) => api.delete(`/dogs/${dogId}/appointments/${apptId}`);

// ── Symptoms ──────────────────────────────────────────────────────────────────

export const getSymptoms = (dogId) => api.get(`/dogs/${dogId}/symptoms`);
export const createSymptom = (dogId, data) => api.post(`/dogs/${dogId}/symptoms`, data);
export const createQuickSymptom = (dogId, data) => api.post(`/dogs/${dogId}/symptoms/quick`, data);
export const updateSymptom = (dogId, symId, data) => api.patch(`/dogs/${dogId}/symptoms/${symId}`, data);
export const deleteSymptom = (dogId, symId) => api.delete(`/dogs/${dogId}/symptoms/${symId}`);

// ── Dashboard Reminders ──────────────────────────────────────────────────────

export const getFullRemindersList = (windowDays) =>
  api.get('/dashboard/reminders/full', {
    params: windowDays ? { windowDays } : undefined,
  });

export default api;
