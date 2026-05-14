# Tasks: Milo Care MVP — Dog Health Management Platform

**Input**: Design documents from `/specs/001-milo-care-mvp/`
**Prerequisites**: [plan.md](plan.md) ✅, [spec.md](spec.md) ✅, [research.md](research.md) ✅, [data-model.md](data-model.md) ✅, [contracts/](contracts/) ✅, [quickstart.md](quickstart.md) ✅

**Stack**: Node.js 20 LTS + Express 4 (backend) · React 18 + Vite 5 + Redux Toolkit (frontend) · MongoDB + Mongoose · Resend SDK (email) · Docker Compose

**Tests**: Not requested — no test tasks included.

## Format: `- [ ] T### [P?] [US?] Description — file path`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US#]**: User story this task belongs to (US1–US5); omitted for Setup/Foundational/Polish
- All paths are relative to repo root

---

## Phase 1: Setup

**Purpose**: Project scaffolding and tooling — no dependencies, start immediately.

- [x] T001 Initialize backend Node.js project with Express 4, Mongoose 8, jsonwebtoken, bcryptjs, resend, dotenv, nodemon — `backend/package.json`
- [x] T002 [P] Initialize frontend project with Vite + React 18, React Router 6, Redux Toolkit, Axios — `frontend/package.json`
- [x] T003 [P] Configure ESLint for backend — `backend/.eslintrc.js`
- [x] T004 [P] Configure ESLint for frontend — `frontend/.eslintrc.js`
- [x] T005 [P] Create Docker Compose with `mongo:7.0` (platform linux/arm64/v8), backend, and frontend services — `docker-compose.yml`

**Checkpoint**: Both projects bootstrap without errors; `docker compose up` starts all three services.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. No story work begins until this phase is complete.

**⚠️ CRITICAL**: Phases 3–7 cannot start until this phase is complete.

- [x] T006 Create MongoDB connection module with graceful connection-error logging — `backend/src/config/db.js`
- [x] T007 [P] Create environment variable validator (fail-fast on missing vars at startup) — `backend/src/config/env.js`
- [x] T008 Create Express app with JSON body-parsing, CORS, route mounting, and global error handler — `backend/src/app.js`
- [x] T009 Create server entry point that connects MongoDB then starts HTTP listener — `backend/src/server.js`
- [x] T010 Create User Mongoose schema: `email`, `passwordHash`, `name`, `tier` (free|premium), `notificationPreferences`, embedded `dogs[]` array; each dog embeds `vaccinations[]`, `medications[]`, `appointments[]`, `symptoms[]` per data-model.md — `backend/src/models/User.js`
- [x] T011 Create JWT authentication middleware: extract Bearer token, verify, attach `req.user` — `backend/src/middleware/auth.js`
- [x] T012 [P] Create tier enforcement middleware: return `403 TIER_LIMIT_EXCEEDED` when free-tier user exceeds 1 dog — `backend/src/middleware/tierEnforcement.js`
- [x] T013 [P] Create global error-handler middleware mapping domain errors to consistent JSON HTTP responses — `backend/src/middleware/errorHandler.js`
- [x] T014 Create `EmailService` class wrapping Resend SDK with `sendPasswordReset`, `sendVaccinationReminder`, `sendMedicationReminder`, `sendAppointmentReminder` methods and retry/backoff — `backend/src/services/EmailService.js`
- [x] T015 Create `ReminderJob` service: 5-minute polling loop that queries records with `nextReminderAt <= now` across all users/dogs and dispatches emails via EmailService — `backend/src/services/ReminderJob.js`
- [x] T016 [P] Set up Redux Toolkit store with `authSlice` (user, token, tier, `setCredentials`/`clearCredentials` reducers, `selectCurrentUser` selector) — `frontend/src/store/authSlice.js`, `frontend/src/store/index.js`
- [x] T017 [P] Create Axios API client with base URL from `VITE_BACKEND_URL`, JWT request interceptor, and 401 auto-logout response interceptor — `frontend/src/services/api.js`
- [x] T018 Create React Router app shell with public routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) and protected routes under `ProtectedRoute` — `frontend/src/App.jsx`
- [x] T019 [P] Create `ProtectedRoute` component that redirects unauthenticated users to `/login` — `frontend/src/components/ProtectedRoute.jsx`
- [x] T020 [P] Create base CSS design system: CSS variables, reset, typography, form fields, buttons, cards, badges, offline banner — `frontend/src/index.css`
- [x] T021 [P] Create `OfflineIndicator` component displaying a fixed banner when `navigator.onLine` is `false` — `frontend/src/components/OfflineIndicator.jsx`

**Checkpoint**: Backend starts on `:3001`, MongoDB connects, JWT middleware rejects unauthenticated requests; frontend boots on `:5173` with routing.

---

## Phase 3: User Story 1 — Account Registration & Dog Profile Setup (Priority: P1) 🎯 MVP

**Goal**: A new user can register, log in, create a dog profile, and reach a fully usable health dashboard. Delivers the entry point to all other features.

**Independent Test**: Sign up with name + email + password → redirected to "Create your dog" → enter name, breed, date of birth → land on health dashboard showing dog profile card and empty health sections.

- [x] T022 [P] [US1] Implement `POST /api/auth/register` (validate fields, bcryptjs hash, return JWT + user) and `POST /api/auth/login` (verify credentials, return JWT + user) — `backend/src/routes/auth.js`
- [x] T023 [P] [US1] Create `PasswordResetToken` Mongoose model: `tokenHash`, `userId`, `expiresAt`, TTL index for automatic expiry — `backend/src/models/PasswordResetToken.js`
- [x] T024 [US1] Implement `POST /api/auth/forgot-password` (generate `crypto.randomBytes(32)` token, hash + store, send reset email; always return generic message to prevent enumeration) and `POST /api/auth/reset-password` (verify hash + expiry, update password, delete token, invalidate sessions) — `backend/src/routes/auth.js`
- [x] T025 [P] [US1] Implement `POST /api/auth/logout` (stateless; exists for consistency) and `DELETE /api/auth/me` (full GDPR data purge of User document) — `backend/src/routes/auth.js`
- [x] T026 [US1] Implement `GET /api/dogs` and `POST /api/dogs` with free-tier 1-dog enforcement (return `403 TIER_LIMIT_EXCEEDED` when tier is `free` and dog count ≥ 1) — `backend/src/routes/dogs.js`
- [x] T027 [P] [US1] Implement `GET /api/dogs/:dogId`, `PUT /api/dogs/:dogId`, `DELETE /api/dogs/:dogId` — validate `dateOfBirth` is in the past and ≤ 30 years ago — `backend/src/routes/dogs.js`
- [x] T028 [US1] Build `RegisterPage`: name, email, password form with field-level validation; dispatch register action; redirect to `/dogs/new` on success — `frontend/src/pages/RegisterPage.jsx`
- [x] T029 [P] [US1] Build `LoginPage`: email, password form; dispatch login action; redirect to `/dashboard` — `frontend/src/pages/LoginPage.jsx`
- [x] T030 [P] [US1] Build `ForgotPasswordPage` (email input, send reset link) and `ResetPasswordPage` (new password + confirm, submit token) — `frontend/src/pages/ForgotPasswordPage.jsx`, `frontend/src/pages/ResetPasswordPage.jsx`
- [x] T031 [US1] Build `DogProfileSetupPage` (add dog: name, breed, date of birth, optional photo URL); call `POST /api/dogs`; redirect to `/dashboard` — `frontend/src/pages/DogProfileSetupPage.jsx`
- [x] T032 [P] [US1] Build `DogListPage`: list all dog profiles with edit/delete actions; link to add second dog (premium users) — `frontend/src/pages/DogListPage.jsx`
- [x] T033 [US1] Build `DashboardPage`: sticky topbar (🐾 Milo Care brand + greeting + logout), gradient dog profile card (avatar/initial, name, breed, age), 5-card health-section grid (Vaccinations, Medications, Appointments, Symptoms, Full History), dog switcher tabs (2+ dogs), empty state, footer quick-links — `frontend/src/pages/DashboardPage.jsx`
- [x] T034 [P] [US1] Add dashboard CSS: `.dashboard-shell`, `.dashboard-topbar`, `.dashboard-brand`, `.dog-profile-card`, `.dog-avatar-placeholder`, `.dog-tabs`, `.health-grid`, `.health-card`, `.dashboard-footer-links`, responsive breakpoints — `frontend/src/index.css`

**Checkpoint**: Full registration → login → create dog → dashboard flow works end-to-end. Free-tier limit returns `403` for second dog.

---

## Phase 4: User Story 2 — Vaccination Tracking & Reminders (Priority: P1)

**Goal**: A user can log vaccination records with an optional next-due date and receive an email reminder `vaccinationWindowDays` days before.

**Independent Test**: Log a vaccination with a due date 5 days from now → record appears in chronological history → ReminderJob dispatches `sendVaccinationReminder` email when `nextReminderAt <= now`.

- [x] T035 [US2] Implement `GET /api/dogs/:dogId/vaccinations` (ordered by `dateAdministered` asc, computed `status`: upcoming/overdue/no-reminder) and `POST /api/dogs/:dogId/vaccinations` (compute `nextReminderAt = nextDueDate - vaccinationWindowDays`; return `409 DUPLICATE_WARNING` if same `vaccineName` + `dateAdministered` already exists — FR-007) — `backend/src/routes/vaccinations.js`
- [x] T036 [P] [US2] Implement `PUT /api/dogs/:dogId/vaccinations/:vaccinationId` (recompute `nextReminderAt` on due-date change) and `DELETE /api/dogs/:dogId/vaccinations/:vaccinationId` — `backend/src/routes/vaccinations.js`
- [x] T037 [US2] Extend `ReminderJob` to query vaccinations with `nextReminderAt <= now`, dispatch `sendVaccinationReminder` via EmailService, then clear `nextReminderAt` — `backend/src/services/ReminderJob.js`
- [x] T038 [P] [US2] Build `VaccinationListPage`: chronological history, `upcoming`/`overdue`/`no-reminder` status badges, "Add Vaccination" button, edit/delete actions — `frontend/src/pages/VaccinationListPage.jsx`
- [x] T039 [P] [US2] Build `AddVaccinationForm`: vaccine name, date administered, optional next due date, optional vet name, optional notes; surface duplicate warning before saving — `frontend/src/components/AddVaccinationForm.jsx`
- [x] T040 [P] [US2] Add vaccination API calls (`getVaccinations`, `createVaccination`, `updateVaccination`, `deleteVaccination`) — `frontend/src/services/api.js`

**Checkpoint**: Log vaccination with due date → see on dashboard → ReminderJob fires email → record shows correct `upcoming`/`overdue` status.

---

## Phase 5: User Story 3 — Medication Management & Dosage Reminders (Priority: P2)

**Goal**: A user can add a medication schedule with recurring reminders; mark it complete to archive it.

**Independent Test**: Add "Apoquel 10mg every 24h" → appears in active list → ReminderJob sends `sendMedicationReminder` and advances `nextReminderAt += frequencyHours` → mark as completed → moves to archive.

- [x] T041 [US3] Implement `GET /api/dogs/:dogId/medications` (supports `?status=active|completed|all`), `POST /api/dogs/:dogId/medications` (validate `frequencyHours` 1–168, set `nextReminderAt = startDate`, default `status: active`) — `backend/src/routes/medications.js`
- [x] T042 [P] [US3] Implement `PUT /api/dogs/:dogId/medications/:medicationId`, `PATCH /api/dogs/:dogId/medications/:medicationId/status` (`active → completed` transition, FR-010), and `DELETE` — `backend/src/routes/medications.js`
- [x] T043 [US3] Extend `ReminderJob` to query active medications with `nextReminderAt <= now`, dispatch `sendMedicationReminder`, then advance `nextReminderAt += frequencyHours * 3600000` — `backend/src/services/ReminderJob.js`
- [x] T044 [P] [US3] Build `MedicationListPage`: active list and completed-archive tabs, "Add Medication" button, "Mark Complete" action per item — `frontend/src/pages/MedicationListPage.jsx`
- [x] T045 [P] [US3] Build `AddMedicationForm`: medication name, dosage, start date, frequency hours, optional end date, optional notes — `frontend/src/components/AddMedicationForm.jsx`
- [x] T046 [P] [US3] Add medication API calls (`getMedications`, `createMedication`, `updateMedication`, `updateMedicationStatus`, `deleteMedication`) — `frontend/src/services/api.js`

**Checkpoint**: Add medication, see in active list, trigger job → email attempted, advance reminder time, mark complete → moves to archive.

---

## Phase 6: User Story 4 — Veterinary Appointment Scheduling & Reminders (Priority: P2)

**Goal**: A user can schedule a vet appointment and receive an email reminder `appointmentWindowHours` hours before; cancelling clears the reminder.

**Independent Test**: Add appointment 2 days out → see in upcoming list with `reminderAt` shown → ReminderJob dispatches `sendAppointmentReminder` at `reminderAt` → cancel → confirm `reminderAt` cleared.

- [x] T047 [US4] Implement `GET /api/dogs/:dogId/appointments` (upcoming sorted asc, history sorted desc), `POST /api/dogs/:dogId/appointments` (validate `appointmentDate` is in the future; compute `reminderAt = appointmentDate - appointmentWindowHours * 3600000`; default `status: upcoming`) — `backend/src/routes/appointments.js`
- [x] T048 [P] [US4] Implement `PUT /api/dogs/:dogId/appointments/:appointmentId` (recompute `reminderAt` on date change), `PATCH .../status` (`upcoming → cancelled` sets `reminderAt = null`; `upcoming → completed`), and `DELETE` — `backend/src/routes/appointments.js`
- [x] T049 [US4] Extend `ReminderJob` to query upcoming appointments with `reminderAt <= now`, dispatch `sendAppointmentReminder`, then clear `reminderAt` — `backend/src/services/ReminderJob.js`
- [x] T050 [P] [US4] Build `AppointmentListPage`: upcoming and history tabs, "Add Appointment" button, edit/cancel/complete actions — `frontend/src/pages/AppointmentListPage.jsx`
- [x] T051 [P] [US4] Build `AddAppointmentForm`: clinic name, date+time, optional notes — `frontend/src/components/AddAppointmentForm.jsx`
- [x] T052 [P] [US4] Add appointment API calls (`getAppointments`, `createAppointment`, `updateAppointment`, `updateAppointmentStatus`, `deleteAppointment`) — `frontend/src/services/api.js`

**Checkpoint**: Schedule appointment, confirm reminder fires, cancel it, confirm `reminderAt` is null and appointment leaves upcoming list.

---

## Phase 7: User Story 5 — Symptom Recording & Monitoring (Priority: P3)

**Goal**: A user can log health observations and review them in reverse-chronological order for vet reference.

**Independent Test**: Log "Lethargy" entry with description and today's date → appears at top of symptom log → add second entry on earlier date → confirm ordering (newest first).

- [x] T053 [US5] Implement `GET /api/dogs/:dogId/symptoms` (ordered by `dateObserved` desc), `POST /api/dogs/:dogId/symptoms` (validate `dateObserved ≤ today`) — `backend/src/routes/symptoms.js`
- [x] T054 [P] [US5] Implement `PUT /api/dogs/:dogId/symptoms/:symptomId` and `DELETE /api/dogs/:dogId/symptoms/:symptomId` — `backend/src/routes/symptoms.js`
- [x] T055 [P] [US5] Build `SymptomLogPage`: reverse-chronological list, symptom-type badge, description, date; "Log Symptom" button; edit/delete actions — `frontend/src/pages/SymptomLogPage.jsx`
- [x] T056 [P] [US5] Build `AddSymptomForm`: symptom type select (lethargy, vomiting, diarrhea, limping, loss-of-appetite, other), free-text description, date observed — `frontend/src/components/AddSymptomForm.jsx`
- [x] T057 [P] [US5] Add symptom API calls (`getSymptoms`, `createSymptom`, `updateSymptom`, `deleteSymptom`) — `frontend/src/services/api.js`

**Checkpoint**: All 5 user stories independently functional and testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Notification preferences, full health history, GDPR deletion, security hardening, and final validation.

- [x] T058 Implement `GET /api/auth/me/notifications` and `PATCH /api/auth/me/notifications` — read and update `notificationPreferences` (enabled, vaccinationWindowDays, appointmentWindowHours) — `backend/src/routes/auth.js`
- [x] T059 [P] Build `NotificationPreferencesPage`: master on/off toggle, vaccination window (1–30 days), appointment window (1–168 hours) — `frontend/src/pages/NotificationPreferencesPage.jsx`
- [x] T060 [P] Build `HealthHistoryPage`: unified reverse-chronological timeline of all record types (vaccinations, medications, appointments, symptoms) for the active dog — `frontend/src/pages/HealthHistoryPage.jsx`
- [x] T061 Verify `DELETE /api/auth/me` cascades: purges User document (all embedded dogs and health records) and associated `PasswordResetToken` records; confirm GDPR deletion flow end-to-end — `backend/src/routes/auth.js`
- [x] T062 [P] Add rate limiting to `POST /api/auth/forgot-password` (max 3 requests/hour/IP) using express-rate-limit — `backend/src/middleware/rateLimiter.js`
- [x] T063 [P] Add `helmet` middleware for HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) — `backend/src/app.js`
- [x] T064 [P] Audit all frontend forms for consistent field-level validation error display (required fields, format errors, server errors mapped to field or form level) — `frontend/src/components/`, `frontend/src/pages/`
- [ ] T065 Run end-to-end quickstart.md validation: fresh install → `docker compose up` → register → create dog → add vaccination with future due date → verify reminder job fires email → log medication → schedule appointment → log symptom → view full health history

**Checkpoint**: All cross-cutting features work. Security headers present. Rate limiting active on password reset. Account deletion purges all data.

---

## Dependencies

### Phase dependency graph

```
Phase 1 (Setup)
    └→ Phase 2 (Foundation)  ← BLOCKS all user stories
           ├→ Phase 3 (US1 — Auth + Dogs)  ← P1, complete first
           │       ├→ Phase 4 (US2 — Vaccinations)  ← P1, parallel-capable
           │       ├→ Phase 5 (US3 — Medications)   ← P2, parallel-capable
           │       ├→ Phase 6 (US4 — Appointments)  ← P2, parallel-capable
           │       └→ Phase 7 (US5 — Symptoms)       ← P3, fully independent
           └─────────────────────────────────────────→ Phase 8 (Polish)
```

### User story dependencies

| Story | Depends On | Note |
|-------|-----------|------|
| US1 — Auth + Dog Profile | Phase 2 | Foundation for all; complete first |
| US2 — Vaccination | Phase 2 (US1 auth needed in practice) | Extends ReminderJob |
| US3 — Medication | Phase 2; extends ReminderJob from US2 | Sequential with US2 T037 |
| US4 — Appointments | Phase 2; extends ReminderJob from US3 | Sequential with US3 T043 |
| US5 — Symptoms | Phase 2 | Fully independent — no reminder needed |

---

## Parallel Execution Examples

### Phase 2 — within foundation

```
Track A: T006 → T008 → T009 → T010 → T015
Track B: T007 [P], T011 [P], T012 [P], T013 [P]  (independent of Track A)
Track C: T016 [P], T017 [P], T018 → T019 [P], T020 [P], T021 [P]  (frontend — fully parallel)
```

### After Phase 3 is done — parallel story tracks

```
Track A (P1): T035 → T036 → T037 → T038 [P] + T039 [P] + T040 [P]   (US2 Vaccinations)
Track B (P2): T041 → T042 [P] → T043 → T044 [P] + T045 [P] + T046 [P]  (US3 Medications)
Track C (P2): T047 → T048 [P] → T049 → T050 [P] + T051 [P] + T052 [P]  (US4 Appointments)
Track D (P3): T053 → T054 [P] → T055 [P] + T056 [P] + T057 [P]          (US5 Symptoms)
```

---

## Implementation Strategy

| Scope | Phases | Tasks | Delivers |
|-------|--------|-------|----------|
| **Early MVP** | 1–3 | T001–T034 | Register, dog profile, dashboard — validate freemium model |
| **Core MVP** | 1–4 | T001–T040 | + Vaccination reminders — primary value proposition |
| **Full MVP** | 1–7 | T001–T057 | All 5 user stories — ready for public launch |
| **Production-ready** | 1–8 | T001–T065 | + Security, notifications, history, GDPR |

---

## Summary

| | Count |
|---|---|
| **Total tasks** | 65 |
| **Phase 1 — Setup** | 5 |
| **Phase 2 — Foundation** | 16 |
| **Phase 3 — US1 Auth + Dogs (P1)** | 13 |
| **Phase 4 — US2 Vaccinations (P1)** | 6 |
| **Phase 5 — US3 Medications (P2)** | 6 |
| **Phase 6 — US4 Appointments (P2)** | 6 |
| **Phase 7 — US5 Symptoms (P3)** | 5 |
| **Phase 8 — Polish** | 8 |
| **Parallelizable [P] tasks** | 38 |
| **MVP scope (Phases 1–3)** | 34 tasks |
