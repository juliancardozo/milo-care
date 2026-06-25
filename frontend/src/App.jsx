import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { captureRefFromUrl } from './services/referralApi';
import { captureClinicFromUrl } from './services/clinicApi';
import { selectIsAuthenticated } from './store/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LanguageSwitcher from './components/LanguageSwitcher';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MagicLinkPage from './pages/MagicLinkPage';
import MagicLoginPage from './pages/MagicLoginPage';
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
import AdminClinicsPage from './pages/admin/AdminClinicsPage';
import AdminPartnersPage from './pages/admin/AdminPartnersPage';
import VetRoute from './components/VetRoute';
import VetPanelPage from './pages/vet/VetPanelPage';
import VetRegisterPage from './pages/vet/VetRegisterPage';
import ClinicLandingPage from './pages/ClinicLandingPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import RemindersPage from './pages/RemindersPage';
import PdfExportPage from './pages/PdfExportPage';
import UpgradePage from './pages/UpgradePage';
import SubscriptionPage from './pages/SubscriptionPage';
import PublicPetPage from './pages/PublicPetPage';
import VetRecordPage from './pages/VetRecordPage';
import VetShareLinkPage from './pages/VetShareLinkPage';
import CoTutorsPage from './pages/CoTutorsPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import AlbumPage from './pages/AlbumPage';
import CardsPage from './pages/CardsPage';
import MiSeguroPage from './pages/MiSeguroPage';
import PartnerRoute from './components/PartnerRoute';
import PartnerDashboardPage from './pages/partner/PartnerDashboardPage';
import { useI18n } from './i18n/I18nProvider';

export default function App() {
  const location = useLocation();
  const { t } = useI18n();

  // Persiste el código de referido (?ref=CODE) y la clínica entrante (?c=slug) hasta el registro.
  useEffect(() => { captureRefFromUrl(); captureClinicFromUrl(); }, []);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLanding = location.pathname === '/';
  const isPublicPet = location.pathname.startsWith('/p/');
  const isVetRecord = location.pathname.startsWith('/vet/');
  const isClinicLanding = location.pathname.startsWith('/c/');
  const isVetPortal = location.pathname.startsWith('/vet-portal');
  // Hide the global app header on dashboard, landing, and the public/vet/clinic pages
  // (each has its own chrome / is meant for logged-out visitors).
  const showGlobalHeader = !isLanding && location.pathname !== '/dashboard'
    && !isPublicPet && !isVetRecord && !isClinicLanding && !isVetPortal;

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
        <Route path="/magic-link" element={<MagicLinkPage />} />
        <Route path="/magic-login" element={<MagicLoginPage />} />
        <Route path="/p/:dogId" element={<PublicPetPage />} />
        <Route path="/vet/:token" element={<VetRecordPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/c/:slug" element={<ClinicLandingPage />} />
        <Route path="/vet-portal/register" element={<VetRegisterPage />} />

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
          <Route path="/dogs/:dogId/seguro" element={<MiSeguroPage />} />
          <Route path="/dogs/:dogId/cotutores" element={<CoTutorsPage />} />
          <Route path="/settings/account" element={<AccountPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/dashboard/reminders/full" element={<FullRemindersListPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>

        {/* Vet portal (rol 'vet') */}
        <Route element={<VetRoute />}>
          <Route path="/vet-portal" element={<VetPanelPage />} />
        </Route>

        {/* Panel del partner (rol 'partner_admin') */}
        <Route element={<PartnerRoute />}>
          <Route path="/partner" element={<PartnerDashboardPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/clinics" element={<AdminClinicsPage />} />
          <Route path="/admin/partners" element={<AdminPartnersPage />} />
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
