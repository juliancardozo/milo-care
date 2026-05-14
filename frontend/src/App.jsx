import { Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LanguageSwitcher from './components/LanguageSwitcher';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DogListPage from './pages/DogListPage';
import DogProfileSetupPage from './pages/DogProfileSetupPage';
import VaccinationListPage from './pages/VaccinationListPage';
import MedicationListPage from './pages/MedicationListPage';
import AppointmentListPage from './pages/AppointmentListPage';
import SymptomLogPage from './pages/SymptomLogPage';
import HealthHistoryPage from './pages/HealthHistoryPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import { useI18n } from './i18n/I18nProvider';

export default function App() {
  const location = useLocation();
  const { t } = useI18n();
  const showGlobalHeader = location.pathname !== '/dashboard';

  return (
    <>
      {showGlobalHeader && (
        <header className="app-header">
          <div className="app-header-brand">
            <span aria-hidden="true">🐾</span>
            <span>{t('appName')}</span>
          </div>
          <LanguageSwitcher />
        </header>
      )}

      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dogs" element={<DogListPage />} />
          <Route path="/dogs/new" element={<DogProfileSetupPage />} />
          <Route path="/dogs/:dogId/vaccinations" element={<VaccinationListPage />} />
          <Route path="/dogs/:dogId/medications" element={<MedicationListPage />} />
          <Route path="/dogs/:dogId/appointments" element={<AppointmentListPage />} />
          <Route path="/dogs/:dogId/symptoms" element={<SymptomLogPage />} />
          <Route path="/dogs/:dogId/history" element={<HealthHistoryPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
