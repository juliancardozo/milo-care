# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Milo Care (milocura) is a pet health management web app for dog owners — vaccination tracking, medication reminders, appointment scheduling, and symptom logging. It features a freemium model (1 dog on free tier, unlimited on premium) and targets AR/UY users (bilingual ES/EN).

## Commands

### Docker (recommended for full-stack dev)
```bash
docker compose up          # starts mongo, backend (:3001), frontend (:5173)
docker compose down
```

### Backend
```bash
cd backend
npm run dev                # nodemon watch mode
npm test                   # jest --runInBand (required: tests run serially)
npm test -- --testPathPattern=windowResolution   # single test file
npm test -- --testNamePattern="returns default"  # single test by name
```

### Frontend
```bash
cd frontend
npm run dev                # Vite dev server at :5173
npm run lint               # eslint src
npm test                   # vitest
```

### Environment
Copy `backend/.env.example` → `backend/.env`. Required vars: `JWT_SECRET`, `MONGODB_URI`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`. For Docker Compose, use `MONGODB_URI=mongodb://mongo:27017/milocura`.

## Architecture

**Monolith**: Express API (`backend/`) + React SPA (`frontend/`) + MongoDB (embedded subdocs).

### Backend structure

**`src/models/User.js`** — the central document. Dogs, vaccinations, deworming, medications, appointments, and symptoms are all embedded as subdocuments inside the User. There is no standalone Dog collection; `Dog.js` defines the embedded schema only.

**`src/middleware/errorHandler.js`** — defines `TierLimitError`, `NotFoundError`, `ValidationError`. All route handlers call `next(new XxxError(...))` instead of directly writing responses.

**`src/middleware/auth.js`** — JWT Bearer middleware; attaches `req.user = { id, email, tier }`.

**`src/config/featureFlags.js`** — runtime feature flags (env-driven). Currently gates `reminderFullListEnabled`.

**`src/services/` domain services:**
- `reminderFullList.js` + `reminderSort.js` + `windowResolution.js` — reminder pipeline: collect all due items from embedded subdocs, resolve look-ahead window (temp override > user preference > 7-day default), sort deterministically (dueAt → type priority → id).
- `VaccineRulesEngine.js` — generates vaccine schedule events from `src/config/vaccinationRules.js` by country (AR/UY), life stage, and risk profile.
- `CalendarEngine.js` — orchestrates the full calendar: maps existing data, calls VaccineRulesEngine, calls RiskProfileCalculator, generates deworming schedule.
- `OnboardingService.js` — manages multi-step onboarding sessions (13 steps stored in `OnboardingSession` doc, confirmed into User/Dog on final step).
- `RiskProfileCalculator.js` — maps lifestyle answers → risk level (low/medium/high) per `src/config/riskProfiles.js`.
- `RedFlagDetector.js` — detects emergency symptoms that block onboarding progression.
- `ValidationService.js` — per-step field validation for onboarding; also exports `calculateAgeInMonths` / `lifeStageFromAgeMonths`.
- `TierService.js` — `assertCanAddDog(user)` throws `TierLimitError` for free-tier users with ≥1 dog.
- `ReminderJob.js` — `node-cron` job that emails vaccination/deworming/appointment reminders when `nextReminderAt <= now`.

**`src/utils/timeUtils.js`** — all temporal helpers (`getUTCNow`, `getWindowEnd`, `isWithinWindow`, `isOverdue`). Tests inject `now` explicitly rather than mocking this module.

### Frontend structure

**State**: Redux Toolkit with two slices — `auth` (user session) and `onboarding` (13-step flow state). The store is in `src/store/index.js`.

**API layer**: `src/services/api.js` is a single Axios instance with a JWT interceptor. All API calls are exported from this file or from feature-specific service files (`onboardingApi.js`, `calendarApi.js`, `reminderFullListService.js`, `validationRules.js`).

**Routing**: React Router 6 in `App.jsx`. Protected routes are wrapped with `<ProtectedRoute>`. The global header (with `<LanguageSwitcher>`) is hidden on `/dashboard`.

**i18n**: Custom provider in `src/i18n/I18nProvider.jsx`; translations in JSON files under `src/i18n/`. Use `const { t } = useI18n()` — Spanish is the primary language.

**Onboarding components**: `src/components/onboarding/` contains step-specific form components (`OwnerProfileForm`, `DogBasicInfoForm`, `ClinicalHistoryForm`, `LifestyleForm`, etc.) plus `StepIndicator`, `RedFlagAlert`, `DisclosureWarning`.

### Test layout
```
backend/tests/
  unit/          # pure logic (windowResolution, boundaryLogic, onboardingValidation)
  contract/      # API contract tests (route-level, no DB)
  integration/   # full pipeline tests (use in-memory or real DB)
```
Tests pass a `now` parameter explicitly to avoid time-based flakiness.

## Key domain rules

- **Embedded docs**: All health data lives inside `User.dogs[].vaccinations[]` etc., not in separate collections. Queries that look for "all dogs with upcoming vaccinations" must iterate the user document.
- **Reminder window precedence**: `?windowDays` query param (temp override) > `user.reminderWindowPreference` (saved pref) > 7-day default. Invalid temp override falls back to 7-day default (not to user pref) — see `windowResolution.js`.
- **Clinical safety constraint**: Vaccination calendar output is advisory only. All generated events include `requiresVetValidation` flag; high-risk or incomplete profiles get `status: 'pending_vet_validation'`. UI must show veterinarian consultation disclaimer.
- **Country support**: AR and UY only. Country-specific vaccination rules are in `src/config/vaccinationRules.js`.
- **Tier enforcement**: `TierService.assertCanAddDog(user)` must be called before creating any new dog profile.
- **Onboarding session expiry**: `OnboardingSession` documents expire; check `expiresAt` before reusing a draft session.
