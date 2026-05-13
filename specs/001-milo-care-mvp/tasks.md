# Tasks: Milo Care MVP — Dog Health Management Platform

**Input**: Design documents from `/specs/001-milo-care-mvp/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Stack**: Node.js 20 / Express 4 (backend) · React 18 / Vite (frontend) · MongoDB Atlas · Resend (email)

**Tests**: Not requested — no test tasks included.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US#]**: User story this task belongs to
- All paths are relative to repo root

---

## Phase 1: Setup

**Purpose**: Project scaffolding and tooling — no dependencies, start immediately.

- [x] T001 Initialize backend Node.js project with Express, Mongoose, jsonwebtoken, bcrypt, Resend, dotenv, nodemon in `backend/`
- [x] T002 Initialize frontend project with Vite + React 18, React Router 6, Redux Toolkit, Axios in `frontend/`
- [x] T003 [P] Configure ESLint + Prettier for backend in `backend/.eslintrc.js` and `backend/.prettierrc`
- [x] T004 [P] Configure ESLint + Prettier for frontend in `frontend/.eslintrc.js` and `frontend/.prettierrc`
- [x] T005 Configure Jest + Supertest for backend in `backend/package.json` and `backend/jest.config.js`

**Checkpoint**: Both projects bootstrap without errors; linting passes on empty scaffolds.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: Phases 3–7 cannot start until this phase is complete.

- [x] T006 Set up MongoDB connection with environment validation in `backend/src/config/db.js`
- [x] T007 Create User Mongoose schema (email, passwordHash, name, tier, notificationPreferences, dogs[] embedded) in `backend/src/models/User.js`
- [x] T008 Implement JWT authentication middleware (verify Bearer token, attach `req.user`) in `backend/src/middleware/auth.js`
- [x] T009 [P] Implement global error-handling middleware (maps domain errors to HTTP responses, including `TierLimitError → 403`) in `backend/src/middleware/errorHandler.js`
- [x] T010 Implement EmailService wrapper around Resend SDK with retry/backoff in `backend/src/services/EmailService.js`
- [x] T011 Implement TierService with `canAddDog(user, count)` and typed `TierLimitError` class in `backend/src/services/TierService.js`
- [x] T012 Implement ReminderJob scaffold (5-min cron loop, query structure, dispatch hook) in `backend/src/services/ReminderJob.js`
- [x] T013 [P] Bootstrap Express app with route mounting, CORS, JSON parsing, and error handler in `backend/src/app.js`
- [x] T014 [P] Set up Redux Toolkit store with `authSlice` (user, token, tier) in `frontend/src/store/authSlice.js` and `frontend/src/store/index.js`
- [x] T015 [P] Set up React Router routes scaffold (public + protected route wrapper) in `frontend/src/main.jsx` and `frontend/src/components/ProtectedRoute.jsx`

**Checkpoint**: Backend starts on `:3001`; MongoDB connects; JWT middleware rejects unauthenticated requests; frontend boots on `:5173` with routing.

---

## Phase 3: User Story 1 — Account Registration & Dog Profile Setup (Priority: P1) 🎯 MVP

**Goal**: A new user can register, log in, create a dog profile, and land on the health dashboard. Delivers a fully usable empty state — the entry point to the entire platform.

**Independent Test**: Register → create dog profile → see dashboard. No other health features required.

- [x] T016 [P] [US1] Implement `POST /api/auth/register` and `POST /api/auth/login` in `backend/src/routes/auth.js`
- [x] T017 [P] [US1] Create PasswordResetToken Mongoose model (tokenHash, userId, expiresAt, TTL index) in `backend/src/models/PasswordResetToken.js`
- [x] T018 [US1] Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` (rate-limited, generic response, bcrypt token) in `backend/src/routes/auth.js`
- [x] T019 [P] [US1] Implement `POST /api/auth/logout` and `DELETE /api/auth/me` (full data purge) in `backend/src/routes/auth.js`
- [x] T020 [US1] Implement `GET /POST /PATCH /DELETE /api/dogs` with TierService enforcement for free-tier 1-dog limit in `backend/src/routes/dogs.js`
- [x] T021 [P] [US1] Build `RegisterPage` (name, email, password form with field-level validation) in `frontend/src/pages/RegisterPage.jsx`
- [x] T022 [P] [US1] Build `LoginPage` (email, password form) and `ForgotPasswordPage` / `ResetPasswordPage` in `frontend/src/pages/`
- [x] T023 [US1] Build `DogProfileSetupPage` (create first dog: name, breed, date of birth, optional photo URL) in `frontend/src/pages/DogProfileSetupPage.jsx`
- [x] T024 [US1] Build `DashboardPage` with empty health state, upcoming reminders placeholder, and dog switcher (multi-dog support) in `frontend/src/pages/DashboardPage.jsx`
- [x] T025 [P] [US1] Build `DogListPage` (view all dogs, link to add second dog for premium users) in `frontend/src/pages/DogListPage.jsx`
- [x] T026 [P] [US1] Implement API client functions for auth and dogs endpoints in `frontend/src/services/api.js`

**Checkpoint**: Full registration → login → create dog → dashboard flow works end-to-end. Tier limit returns correct 403 for free users adding a second dog.

---

## Phase 4: User Story 2 — Vaccination Tracking & Reminders (Priority: P1)

**Goal**: A user can log vaccination records for their dog and receive an email reminder before the next due date.

**Independent Test**: Add vaccination with due date → confirm reminder appears on dashboard → (manually trigger reminder job) → confirm email dispatched.

- [x] T027 [US2] Implement `GET /POST /PATCH /DELETE /api/dogs/:dogId/vaccinations` with duplicate-detection warning in `backend/src/routes/vaccinations.js`
- [x] T028 [US2] Add `nextReminderAt` computation on vaccination save (dueDate minus user's `vaccinationWindowDays`) in `backend/src/routes/vaccinations.js`
- [x] T029 [US2] Extend ReminderJob to query vaccinations where `nextReminderAt <= now`, dispatch reminder emails via EmailService, then clear `nextReminderAt` in `backend/src/services/ReminderJob.js`
- [x] T030 [P] [US2] Build `VaccinationListPage` (chronological history, upcoming/overdue status badges) in `frontend/src/pages/VaccinationListPage.jsx`
- [x] T031 [P] [US2] Build `AddVaccinationForm` component (vaccine name, date administered, next due date, duplicate warning) in `frontend/src/components/AddVaccinationForm.jsx`
- [x] T032 [US2] Integrate upcoming vaccination reminders card into `DashboardPage` in `frontend/src/pages/DashboardPage.jsx`
- [x] T033 [P] [US2] Add vaccination API calls to `frontend/src/services/api.js`

**Checkpoint**: Log a vaccination with a due date, see it on the dashboard, trigger the reminder job manually and confirm an email send is attempted.

---

## Phase 5: User Story 3 — Medication Management & Dosage Reminders (Priority: P2)

**Goal**: A user can add a medication schedule for their dog and receive recurring email reminders at each dose time.

**Independent Test**: Add medication with 12-hour frequency → confirm next reminder time shown → trigger job → confirm email dispatched → mark completed → confirm archived.

- [x] T034 [US3] Implement `GET /POST /PATCH /DELETE /api/dogs/:dogId/medications` with `nextReminderAt` computation and `status` transitions in `backend/src/routes/medications.js`
- [x] T035 [US3] Extend ReminderJob to query active medications where `nextReminderAt <= now`, dispatch dosage reminder emails, and advance `nextReminderAt` by `frequencyHours` in `backend/src/services/ReminderJob.js`
- [x] T036 [P] [US3] Build `MedicationListPage` (active list + completed archive tabs) in `frontend/src/pages/MedicationListPage.jsx`
- [x] T037 [P] [US3] Build `AddMedicationForm` component (name, dosage, start date, frequency, optional end date) in `frontend/src/components/AddMedicationForm.jsx`
- [x] T038 [US3] Integrate active medications card into `DashboardPage` in `frontend/src/pages/DashboardPage.jsx`
- [x] T039 [P] [US3] Add medication API calls to `frontend/src/services/api.js`

**Checkpoint**: Add a medication, see it in the active list, trigger the reminder job, confirm email attempted, mark as completed, confirm it moves to the archive.

---

## Phase 6: User Story 4 — Veterinary Appointment Scheduling & Reminders (Priority: P2)

**Goal**: A user can schedule a vet appointment and receive an email reminder 24 hours (or configured window) before the appointment.

**Independent Test**: Add appointment → see it in upcoming list with reminder time shown → trigger reminder job → confirm email dispatched → cancel appointment → confirm reminder cleared.

- [x] T040 [US4] Implement `GET /POST /PATCH /DELETE /api/dogs/:dogId/appointments` with `reminderAt` computation and `status` transitions (upcoming → cancelled clears reminderAt) in `backend/src/routes/appointments.js`
- [x] T041 [US4] Extend ReminderJob to query upcoming appointments where `reminderAt <= now`, dispatch appointment reminder emails, and clear `reminderAt` after send in `backend/src/services/ReminderJob.js`
- [x] T042 [P] [US4] Build `AppointmentListPage` (upcoming + history tabs, edit/cancel actions) in `frontend/src/pages/AppointmentListPage.jsx`
- [x] T043 [P] [US4] Build `AddAppointmentForm` component (clinic name, date/time, notes) in `frontend/src/components/AddAppointmentForm.jsx`
- [x] T044 [US4] Integrate upcoming appointments card into `DashboardPage` in `frontend/src/pages/DashboardPage.jsx`
- [x] T045 [P] [US4] Add appointment API calls to `frontend/src/services/api.js`

**Checkpoint**: Add appointment, see it on dashboard, cancel it, confirm reminder is cleared and it disappears from upcoming list.

---

## Phase 7: User Story 5 — Symptom Recording & Monitoring (Priority: P3)

**Goal**: A user can log symptom observations for their dog and review them in reverse-chronological order before vet visits.

**Independent Test**: Log a symptom with type, description, and date → see it in the symptom log (reverse-chronological) → mark as resolved.

- [x] T046 [US5] Implement `GET /POST /PATCH /DELETE /api/dogs/:dogId/symptoms` (ordered by `dateObserved` desc) in `backend/src/routes/symptoms.js`
- [x] T047 [P] [US5] Build `SymptomLogPage` (reverse-chronological list, resolved/unresolved filter, mark-as-resolved action) in `frontend/src/pages/SymptomLogPage.jsx`
- [x] T048 [P] [US5] Build `AddSymptomForm` component (symptom type, description, date observed) in `frontend/src/components/AddSymptomForm.jsx`
- [x] T049 [P] [US5] Add symptom API calls to `frontend/src/services/api.js`

**Checkpoint**: Log multiple symptoms, verify reverse-chronological order, mark one as resolved, confirm filtered views work.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Notification preferences, full health history, GDPR deletion, offline UX, and validation polish across all stories.

- [x] T050 Implement `PATCH /api/auth/me/notifications` to update `vaccinationWindowDays`, `appointmentWindowHours`, and `enabled` flag in `backend/src/routes/auth.js`
- [x] T051 [P] Build `NotificationPreferencesPage` (toggle all notifications, set vaccination window days, appointment window hours) in `frontend/src/pages/NotificationPreferencesPage.jsx`
- [x] T052 [P] Build `HealthHistoryPage` showing all records (vaccinations, medications, appointments, symptoms) per dog in a unified timeline in `frontend/src/pages/HealthHistoryPage.jsx`
- [x] T053 Verify `DELETE /api/auth/me` performs full cascade purge (User + all embedded dogs, PasswordResetToken records) and confirm GDPR account deletion flow works end-to-end in `backend/src/routes/auth.js`
- [x] T054 [P] Add `OfflineIndicator` banner component (shown when `navigator.onLine === false`) in `frontend/src/components/OfflineIndicator.jsx`
- [x] T055 [P] Audit all forms for consistent field-level validation error display (required fields, format errors, server errors) across `frontend/src/components/` and `frontend/src/pages/`
- [ ] T056 Validate `quickstart.md` end-to-end: fresh clone → install → configure `.env` → start both servers → complete full new-user registration + dog profile + vaccination flow

**Checkpoint**: All 5 user stories work together cohesively. Notification preferences affect reminder timing. Account deletion purges all data. Offline banner appears on disconnect.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └→ Phase 2 (Foundational) — BLOCKS all user stories
           ├→ Phase 3 (US1 — Auth + Dog Profile) — P1, MVP
           ├→ Phase 4 (US2 — Vaccination)         — P1, can start after Phase 2
           ├→ Phase 5 (US3 — Medication)           — P2, can start after Phase 2
           ├→ Phase 6 (US4 — Appointments)         — P2, can start after Phase 2
           └→ Phase 7 (US5 — Symptoms)             — P3, can start after Phase 2
                    All complete → Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 (Auth + Dog Profile) | Phase 2 | Foundation for all stories — complete first |
| US2 (Vaccination) | Phase 2; US1 auth required in practice | Independently testable via API |
| US3 (Medication) | Phase 2; ReminderJob from US2 extended | Extends ReminderJob — sequential with US2's T029 |
| US4 (Appointments) | Phase 2; ReminderJob from US3 extended | Extends ReminderJob — sequential with US3's T035 |
| US5 (Symptoms) | Phase 2 | Fully independent — no reminder job needed |

### Within Each User Story

- Backend routes before frontend API client
- Frontend API client before page components
- Page components before dashboard integration

---

## Parallel Execution Examples

### Phase 2 (Foundational) — parallel opportunities

```
Day 1 track A: T006 → T007 → T008
Day 1 track B: T009, T010, T011 (in parallel)
Day 1 track C: T012, T013 (in parallel after T007)
Day 1 track D: T014, T015 (frontend — fully parallel with backend)
```

### Phase 3 (US1) — parallel opportunities

```
Backend track:  T016 [P] + T017 [P] in parallel → T018 → T019 [P] → T020
Frontend track: T021 [P] + T022 [P] in parallel → T023 → T024 → T025 [P]
API client:     T026 [P] — can run alongside backend and frontend tracks
```

### Phase 4–7 — parallel across stories (if staffed)

```
Once Phase 2 complete:
  Developer A: Phase 3 (US1)
  Developer B: Phase 4 (US2) — backend routes and reminder job
  Developer C: Phase 5 (US3) — backend routes
  Developer D: Phase 7 (US5) — fully independent
```

---

## Implementation Strategy

**MVP scope** (Phases 1–3): Phases 1, 2, and 3 alone deliver a fully deployable product. Users can register, create a dog profile, and access a health dashboard — sufficient for early-adopter validation of the freemium model.

**Increment 1** (Phases 1–4): Adds vaccination tracking and email reminders — the core value proposition for user adoption (SC-003, SC-004).

**Full MVP** (Phases 1–7): All 5 user stories implemented. Ready for public launch targeting the success criteria in the spec.

**Polish** (Phase 8): Cross-cutting improvements. Can be delivered as a post-launch patch or alongside Phase 7.

---

## Summary

| | |
|---|---|
| **Total tasks** | 56 |
| **Phase 1 (Setup)** | 5 tasks |
| **Phase 2 (Foundational)** | 10 tasks |
| **Phase 3 (US1)** | 11 tasks |
| **Phase 4 (US2)** | 7 tasks |
| **Phase 5 (US3)** | 6 tasks |
| **Phase 6 (US4)** | 6 tasks |
| **Phase 7 (US5)** | 4 tasks |
| **Phase 8 (Polish)** | 7 tasks |
| **Parallelizable tasks** | 28 tasks marked [P] |
| **MVP scope** | Phases 1–3 (26 tasks) |
