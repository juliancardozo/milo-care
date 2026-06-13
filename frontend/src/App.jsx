import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { captureRefFromUrl } from './services/referralApi';
import { selectIsAuthenticated } from './store/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LanguageSwitcher from './components/LanguageSwitcher';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DogListPage from './pages/DogListPage';
import DogProfileSetupPage from './pages/DogProfileSetupPage';
import AddDogGate from './pages/AddDogGate';
import OnboardingSummaryPage from './pages/OnboardingSummaryPage';
import VaccinationListPage from './pages/VaccinationListPage';
import MedicationListPage from './pages/MedicationListPage';
import AppointmentListPage from './pages/AppointmentListPage';
import SymptomLogPage from './pages/SymptomLogPage';
import HealthHistoryPage from './pages/HealthHistoryPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import FullRemindersListPage from './pages/FullRemindersListPage';
import DogEditPage from './pages/DogEditPage';
import AccountPage from './pages/AccountPage';
import UserMenu from './components/UserMenu';
import AdminRoute from './components/AdminRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import RemindersPage from './pages/RemindersPage';
import PdfExportPage from './pages/PdfExportPage';
import UpgradePage from './pages/UpgradePage';
import SubscriptionPage from './pages/SubscriptionPage';
import PublicPetPage from './pages/PublicPetPage';
import VetRecordPage from './pages/VetRecordPage';
import VetShareLinkPage from './pages/VetShareLinkPage';
import AlbumPage from './pages/AlbumPage';
import CardsPage from './pages/CardsPage';
import { useI18n } from './i18n/I18nProvider';

export default function App() {
  const location = useLocation();
  const { t } = useI18n();

  // Persiste el código de referido entrante (?ref=CODE) hasta el registro.
  useEffect(() => { captureRefFromUrl(); }, []);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLanding = location.pathname === '/';
  const isPublicPet = location.pathname.startsWith('/p/');
  const isVetRecord = location.pathname.startsWith('/vet/');
  // Hide the global app header on dashboard, landing, and the public/vet pages
  // (each has its own chrome / is meant for logged-out visitors).
  const showGlobalHeader = !isLanding && location.pathname !== '/dashboard' && !isPublicPet && !isVetRecord;

  return (
    <>
      {showGlobalHeader && (
        <header className="app-header">
          <Link to="/" className="app-header-brand" aria-label="Volver a la página principal">
            <span aria-hidden="true">🐾</span>
            <span>{t('appName')}</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>
      )}

      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/p/:dogId" element={<PublicPetPage />} />
        <Route path="/vet/:token" element={<VetRecordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dogs" element={<DogListPage />} />
          <Route path="/dogs/new" element={<AddDogGate />} />
          <Route path="/dogs/onboarding/legacy" element={<DogProfileSetupPage />} />
          <Route path="/dogs/onboarding/summary" element={<OnboardingSummaryPage />} />
          <Route path="/dogs/:dogId/edit" element={<DogEditPage />} />
          <Route path="/dogs/:dogId/vaccinations" element={<VaccinationListPage />} />
          <Route path="/dogs/:dogId/medications" element={<MedicationListPage />} />
          <Route path="/dogs/:dogId/appointments" element={<AppointmentListPage />} />
          <Route path="/dogs/:dogId/symptoms" element={<SymptomLogPage />} />
          <Route path="/dogs/:dogId/album" element={<AlbumPage />} />
          <Route path="/dogs/:dogId/cards" element={<CardsPage />} />
          <Route path="/dogs/:dogId/history" element={<HealthHistoryPage />} />
          <Route path="/dogs/:dogId/clinical-history" element={<ClinicalHistoryPage />} />
          <Route path="/dogs/:dogId/pdf-export" element={<PdfExportPage />} />
          <Route path="/dogs/:dogId/share" element={<VetShareLinkPage />} />
          <Route path="/settings/account" element={<AccountPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/dashboard/reminders/full" element={<FullRemindersListPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/leads" element={<AdminLeadsPage />} />
        </Route>

        {/* Root: landing for guests, dashboard for authenticated users */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
