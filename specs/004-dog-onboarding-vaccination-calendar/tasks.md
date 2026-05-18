# Tasks: Feature 004 - Dog Onboarding + Vaccination Calendar (AR/UY)

**Source docs**: `specs/004-dog-onboarding-vaccination-calendar/spec.md`, `specs/004-dog-onboarding-vaccination-calendar/plan.md`

**Delivery phases**
- Phase 1 Critical MVP: EPIC-004-001, EPIC-004-002, EPIC-004-003
- Phase 2 Core: EPIC-004-004, EPIC-004-005
- Phase 3 Polish: EPIC-004-006

**Implementation target**: Keep every task small enough for 1-2 days of focused work, with explicit files, test scenarios, and rollout guardrails.

## Epic Map

| Epic ID | Name | Phase | Main Outcome |
|---|---|---:|---|
| EPIC-004-001 | Data Model & API Foundation | Phase 1 | Canonical onboarding data contract and backend persistence |
| EPIC-004-002 | Onboarding UI & Form Flow | Phase 1 | Multi-step onboarding experience with save/resume |
| EPIC-004-003 | Vaccination Calendar Engine | Phase 1 | Age-aware vaccination calendar and AR/UY rules |
| EPIC-004-004 | Deworming & Risk Calculation | Phase 2 | Risk profile and deworming recommendations |
| EPIC-004-005 | Reminder System Integration | Phase 2 | Scheduled reminders and dashboard compatibility |
| EPIC-004-006 | Testing & Deployment | Phase 3 | Safety, release readiness, and rollout validation |

## Dependency Summary

- Frontend tasks depend on API contracts and the onboarding payload shape.
- Calendar engine tasks depend on the shared data model and validation rules.
- Reminder tasks depend on calendar outputs and persisted event status fields.
- Testing tasks depend on the code paths they validate; keep them after the target implementation.
- Deployment and release tasks depend on the feature being fully tested and safety-checked.

## Sprint Recommendation

- Sprint 1: EPIC-004-001 + EPIC-004-002 + start EPIC-004-003
- Sprint 2: finish EPIC-004-003 + EPIC-004-004 + EPIC-004-005
- Sprint 3: EPIC-004-006 and rollout hardening

## Parallel Work Examples

- `TECH-004-001`, `TECH-004-002`, and `TECH-004-003` can be split across backend, contracts, and validation once the epic scope is agreed.
- In the UI epic, `TECH-004-004`, `TECH-004-005`, and `TECH-004-006` can be run in parallel if the route contract is stable.
- In the final phase, `TECH-004-016`, `TECH-004-017`, and `TECH-004-018` can be executed in parallel after the core flows pass smoke tests.

## Phase 1 Critical MVP

## EPIC-004-001 - Data Model & API Foundation

Goal: establish the canonical onboarding data shape, persistence model, and API entry points needed by every later screen and scheduling rule.

### US-004-001 - Define the onboarding domain contract and persistence model
- [x] US-004-001 Define the onboarding domain contract and persistence model for owner, dog, clinical history, lifestyle, vaccination, and deworming data
  - **Category:** User Story
  - **Description:** Create the baseline data model that supports the full onboarding flow, including owner data, dog profile fields, clinical history, lifestyle risk inputs, vaccine records, and deworming history. The task should make the payload shape explicit enough for both frontend and backend teams to implement against the same contract. It must preserve the advisory-only safety boundary and support AR/UY country-specific behavior from the start.
  - **Acceptance Criteria:**
    - The data contract covers every field in the spec for owner, dog, clinical, lifestyle, vaccination, and deworming inputs.
    - The contract states required vs optional fields and default values for unknown data.
    - The onboarding payload can support save/resume without losing intermediate answers.
    - The model is compatible with AR/UY regional rule selection and vet-validation states.
  - **T-shirt sizing:** XL
  - **Dependencies:** plan.md, spec.md, existing `backend/src/models/User.js`
  - **File changes:** `specs/004-dog-onboarding-vaccination-calendar/data-model.md` (new), `specs/004-dog-onboarding-vaccination-calendar/contracts/onboarding.yaml` (new), `backend/src/models/User.js`, `backend/src/models/Dog.js` (new)
  - **Estimated hours:** 12
  - **Risk level:** High
  - **Test scenarios:**
    - Serialize a full onboarding payload with all sections populated.
    - Serialize a partial payload with missing optional sections and verify defaults remain stable.
    - Verify the model can distinguish exact, estimated, and unknown birth dates.

### TECH-004-001 - Add backend persistence models for onboarding and calendar entities
- [x] TECH-004-001 Add backend persistence models for onboarding and calendar entities
  - **Category:** Technical Task
  - **Description:** Extend the backend model layer so the feature has durable entities for onboarding sessions, vaccination events, deworming events, and computed risk profiles. Reuse the existing embedded-user approach where it fits the MVP, but split out the new domain objects so later calendar and reminder logic has a stable place to read and write state. Keep the schema aligned with the planned API contract and make sure timestamps and status fields are included.
  - **Acceptance Criteria:**
    - The backend has schema files for the new onboarding and calendar entities.
    - The user model supports the new onboarding fields without breaking existing auth or dog flows.
    - Status fields include the vet-validation and incomplete-data states from the spec.
    - The schema supports timestamps, source metadata, and reminder-friendly due dates.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-001
  - **File changes:** `backend/src/models/User.js`, `backend/src/models/Dog.js` (new), `backend/src/models/OnboardingSession.js` (new), `backend/src/models/VaccineEvent.js` (new), `backend/src/models/DewormingEvent.js` (new), `backend/src/models/RiskProfile.js` (new)
  - **Estimated hours:** 10
  - **Risk level:** High
  - **Test scenarios:**
    - Create and read a session document with nested step payloads.
    - Save a vaccine event with pending vet validation.
    - Save a deworming event with source metadata and a future due date.

### TECH-004-002 - Add onboarding routes, validation middleware, and contract docs
- [x] TECH-004-002 Add onboarding routes, validation middleware, and contract docs
  - **Category:** Technical Task
  - **Description:** Add the backend entry points for starting onboarding, saving each step, fetching a draft summary, and confirming the final profile. Pair the routes with step-level validation middleware so bad inputs fail early and consistently. Document the endpoints in the feature contract directory so the frontend can be implemented against stable request and response shapes.
  - **Acceptance Criteria:**
    - The backend exposes onboarding start, step-save, draft, summary, and confirm endpoints.
    - Each step validates its own required fields and returns structured validation errors.
    - The API contract documents request and response shapes for every onboarding step.
    - Failed validation responses remain advisory and do not mutate persisted state.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-001, TECH-004-001
  - **File changes:** `backend/src/routes/onboarding.js` (new), `backend/src/middleware/validateOnboardingStep.js` (new), `specs/004-dog-onboarding-vaccination-calendar/contracts/onboarding.yaml` (new), `specs/004-dog-onboarding-vaccination-calendar/quickstart.md` (new)
  - **Estimated hours:** 10
  - **Risk level:** Medium
  - **Test scenarios:**
    - Start a new onboarding session and verify a session ID is returned.
    - Post a valid owner step and verify draft state is persisted.
    - Post an invalid dog step and verify the API returns a structured validation error without saving.

### TECH-004-003 - Prevent unsafe onboarding submissions at the API edge
- [x] TECH-004-003 Prevent unsafe onboarding submissions at the API edge
  - **Category:** Bug Prevention
  - **Description:** Harden the onboarding entry point so the feature cannot silently accept unsafe or incomplete clinical data. This includes explicit disclaimer acceptance, AR/UY country validation, unique email checks, timezone handling, and guardrails for red-flag symptoms or impossible dates. The goal is to fail fast and keep the downstream calendar engine from receiving malformed or unsafe payloads.
  - **Acceptance Criteria:**
    - The API rejects onboarding submissions when the disclaimer is not accepted.
    - The API rejects unsupported countries or missing mandatory owner fields.
    - The API surfaces red-flag symptom alerts before final confirmation.
    - Duplicate email and future birth-date conditions return clear, actionable errors.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-002
  - **File changes:** `backend/src/routes/onboarding.js`, `backend/src/services/ValidationService.js` (new), `backend/src/middleware/errorHandler.js`
  - **Estimated hours:** 6
  - **Risk level:** High
  - **Test scenarios:**
    - Submit onboarding without disclaimer acceptance and verify a 400 response.
    - Submit an unsupported country and verify the request is blocked.
    - Submit a red-flag symptom payload and verify the response warns and blocks finalization.

### TECH-004-004 - Build contract and integration tests for onboarding foundation
- [x] TECH-004-004 Build contract and integration tests for onboarding foundation
  - **Category:** Testing
  - **Description:** Create the first failing tests for the onboarding foundation, covering the contract shape, step validation, and persistence behavior. These tests should focus on the highest-risk parts of the model and routes so that later UI and calendar work can rely on stable data. Keep the tests narrow and deterministic, and make sure they validate both happy-path and safety-path behavior.
  - **Acceptance Criteria:**
    - Contract tests describe the expected onboarding request and response payloads.
    - Integration tests verify draft saves, step validation, and confirmation behavior.
    - Tests cover at least one missing-field error and one disclaimer failure.
    - Test names and fixtures map directly to the onboarding step they protect.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-001, TECH-004-002, TECH-004-003
  - **File changes:** `backend/tests/contract/onboarding-contract.test.js` (new), `backend/tests/integration/onboarding-session.test.js` (new), `backend/tests/unit/onboardingValidation.test.js` (new)
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Confirm the API schema rejects missing required owner fields.
    - Confirm a valid draft save returns the expected shape.
    - Confirm final confirm blocks when disclaimer or red-flag conditions are present.

## EPIC-004-002 - Onboarding UI & Form Flow

Goal: deliver the 13-step conversational onboarding experience with progress tracking, draft persistence, and a final summary that makes the backend contract usable from the browser.

### US-004-002 - Build the multi-step onboarding experience
- [x] US-004-002 Build the multi-step onboarding experience with save/resume and summary review
  - **Category:** User Story
  - **Description:** Implement the user-facing onboarding journey for dog registration. The flow should feel conversational, show progress, allow the user to move forward and back safely, and support saving draft state across reloads. It must include the disclaimer and a final review screen before confirmation, plus a clear path for red-flag symptom handling and missing-data warnings.
  - **Acceptance Criteria:**
    - The flow presents the onboarding screens in the correct order with visible progress.
    - The user can save a draft and return later without losing entered data.
    - The final review screen shows the collected data before confirmation.
    - The disclaimer is visible early and re-confirmed before completion.
  - **T-shirt sizing:** XL
  - **Dependencies:** US-004-001, TECH-004-002
  - **File changes:** `frontend/src/pages/DogOnboardingPage.jsx` (new), `frontend/src/pages/OnboardingSummaryPage.jsx` (new), `frontend/src/App.jsx`, `frontend/src/pages/DogProfileSetupPage.jsx`
  - **Estimated hours:** 12
  - **Risk level:** High
  - **Test scenarios:**
    - Walk through the flow from start to summary and confirm progress updates.
    - Reload mid-flow and confirm draft answers are restored.
    - Trigger a missing-data warning and verify the user can navigate back to fix it.

### TECH-004-005 - Create reusable onboarding components and screen sections
- [x] TECH-004-005 Create reusable onboarding components and screen sections
  - **Category:** Technical Task
  - **Description:** Build the reusable forms and visual structure for the onboarding screens. Break the flow into small components for owner details, dog basics, clinical history, lifestyle, vaccination records, deworming history, red-flag alerts, and the final review. Keep the components composable so the same forms can be reused in the summary and future edit screens without a rewrite.
  - **Acceptance Criteria:**
    - Each onboarding section is isolated into a reusable component.
    - The red-flag alert and disclaimer components can be rendered independently.
    - The step indicator reflects the current step and total step count.
    - The summary view can reuse the same section components in read-only mode.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-002
  - **File changes:** `frontend/src/components/onboarding/OwnerProfileForm.jsx` (new), `frontend/src/components/onboarding/DogBasicInfoForm.jsx` (new), `frontend/src/components/onboarding/ClinicalHistoryForm.jsx` (new), `frontend/src/components/onboarding/LifestyleForm.jsx` (new), `frontend/src/components/onboarding/VaccinationRecordForm.jsx` (new), `frontend/src/components/onboarding/DewormingHistoryForm.jsx` (new), `frontend/src/components/onboarding/StepIndicator.jsx` (new), `frontend/src/components/onboarding/DisclosureWarning.jsx` (new), `frontend/src/components/onboarding/RedFlagAlert.jsx` (new)
  - **Estimated hours:** 10
  - **Risk level:** Medium
  - **Test scenarios:**
    - Render each form section in isolation and confirm required props are enough.
    - Render the summary screen in read-only mode and confirm values match the form data.
    - Render the red-flag alert and confirm it blocks progression visually.

### TECH-004-006 - Wire onboarding state, API calls, and route integration
- [x] TECH-004-006 Wire onboarding state, API calls, and route integration
  - **Category:** Technical Task
  - **Description:** Connect the onboarding UI to the backend via a dedicated service layer and a Redux slice or equivalent state container. This task should handle step transitions, draft persistence, backend save calls, and navigation into the final summary or success page. Make sure the existing dashboard and dog setup routes point to the new flow without breaking legacy navigation.
  - **Acceptance Criteria:**
    - The frontend uses a dedicated onboarding API service instead of direct ad hoc fetch calls.
    - The current step and draft data survive normal navigation and reloads.
    - The app routes `/dogs/new` or the chosen entry route into the onboarding flow.
    - Confirmation routes the user to a post-save success or dashboard state.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-002, TECH-004-005
  - **File changes:** `frontend/src/store/onboardingSlice.js` (new), `frontend/src/services/onboardingApi.js` (new), `frontend/src/App.jsx`, `frontend/src/pages/DogProfileSetupPage.jsx`, `frontend/src/pages/DashboardPage.jsx`
  - **Estimated hours:** 10
  - **Risk level:** Medium
  - **Test scenarios:**
    - Save a draft step and verify state is still available after navigation.
    - Open `/dogs/new` and confirm the onboarding route is used.
    - Confirm the API service serializes the payload exactly as the backend expects.

### TECH-004-007 - Prevent step-skipping, draft loss, and invalid client-side input
- [x] TECH-004-007 Prevent step-skipping, draft loss, and invalid client-side input
  - **Category:** Bug Prevention
  - **Description:** Add client-side guardrails so users cannot accidentally skip required steps, lose progress on refresh, or submit obvious invalid values like future dates, out-of-range weights, or missing disclaimers. This task is about reducing noisy backend errors and preventing avoidable user frustration. Keep the checks aligned with the same rules as the backend so validation behavior stays consistent.
  - **Acceptance Criteria:**
    - Navigation cannot advance when mandatory step fields are empty or invalid.
    - Draft state is saved before the user leaves the page or refreshes.
    - The client warns on future birth dates, impossible weights, and missing disclaimers.
    - Client validation messages match the backend language closely enough to avoid confusion.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-005, TECH-004-006
  - **File changes:** `frontend/src/components/onboarding/StepIndicator.jsx`, `frontend/src/components/onboarding/DisclosureWarning.jsx`, `frontend/src/services/validationRules.js` (new), `frontend/src/pages/DogOnboardingPage.jsx`
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Try advancing with an empty required field and verify the UI blocks it.
    - Refresh the page mid-flow and verify the draft is restored.
    - Enter an invalid DOB or weight and verify the client shows a blocking error.

### TECH-004-008 - Add frontend integration tests for onboarding navigation and validation
- [x] TECH-004-008 Add frontend integration tests for onboarding navigation and validation
  - **Category:** Testing
  - **Description:** Create the first browser-level tests for the onboarding flow so the step navigation, draft persistence, disclaimer gating, and summary screen are verified before calendar logic is added. Focus on the highest-value path: starting a profile, moving through several steps, returning to a previous step, and confirming the review screen. Keep the tests deterministic and driven by small fixtures.
  - **Acceptance Criteria:**
    - Tests cover a happy-path onboarding walkthrough.
    - Tests cover at least one validation failure and one disclaimer failure.
    - Tests confirm the summary screen reflects the same values entered earlier.
    - Test fixtures are isolated and reusable across future onboarding cases.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-005, TECH-004-006, TECH-004-007
  - **File changes:** `frontend/src/test/onboarding.integration.test.jsx` (new), `frontend/src/test/fixtures/onboardingFixtures.js` (new)
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Complete the onboarding flow end to end in the test harness.
    - Trigger a validation error and confirm the next step is blocked.
    - Confirm the summary review shows the same owner and dog data entered in earlier steps.

## EPIC-004-003 - Vaccination Calendar Engine

Goal: generate the preventive vaccination calendar using dog age, country profile, and prior records, while keeping every recommendation advisory and vet-review aware.

### US-004-003 - Generate vaccination schedules from age and record history
- [x] US-004-003 Generate vaccination schedules from age, country, and prior record history
  - **Category:** User Story
  - **Description:** Build the vaccination calendar logic that transforms onboarding data into a clear, preventive schedule. The engine must account for life stage, AR/UY rabies rules, missing vaccination history, and vet-validation requirements. It should return understandable event records that the frontend can render as a draft calendar and that the reminder system can later consume.
  - **Acceptance Criteria:**
    - The engine produces a schedule for puppies, adults, and senior dogs.
    - Rabies, core vaccines, and conditional vaccines are handled according to country and risk context.
    - Dogs with incomplete history are marked as needing vet validation.
    - Calendar output includes clear statuses and due dates.
  - **T-shirt sizing:** XL
  - **Dependencies:** US-004-001, TECH-004-001, TECH-004-002
  - **File changes:** `backend/src/services/CalendarEngine.js` (new), `backend/src/services/VaccineRulesEngine.js` (new), `backend/src/config/vaccinationRules.js` (new), `backend/src/routes/calendar.js` (new)
  - **Estimated hours:** 12
  - **Risk level:** High
  - **Test scenarios:**
    - Generate a puppy schedule with no prior vaccines.
    - Generate an adult catch-up schedule with missing history.
    - Generate an AR/UY schedule and verify rabies timing is included.

### TECH-004-009 - Expose calendar payloads and summary endpoints
- [x] TECH-004-009 Expose calendar payloads and summary endpoints
  - **Category:** Technical Task
  - **Description:** Add the backend endpoints needed to serve the generated vaccine calendar, a draft summary, and any dog-level calendar views used by the frontend. The endpoints should return the same event shapes the engine produces and should be wired into the existing Express app without breaking the current dog or vaccination routes. Keep the response format stable and easy to render in the browser.
  - **Acceptance Criteria:**
    - The backend exposes endpoints for getting a generated calendar and a summary view.
    - The endpoints use the same status and due-date fields as the engine output.
    - The routes are mounted in the Express app and authenticated consistently.
    - The API responses are compatible with the summary and calendar UI components.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-003, TECH-004-001
  - **File changes:** `backend/src/routes/calendar.js` (new), `backend/src/app.js`, `frontend/src/services/calendarApi.js` (new), `frontend/src/pages/OnboardingSummaryPage.jsx`
  - **Estimated hours:** 8
  - **Risk level:** Medium
  - **Test scenarios:**
    - Request a calendar for a dog with vaccines and verify the response shape.
    - Request a summary view and verify it includes event statuses.
    - Confirm authentication remains required for the new route.

### TECH-004-010 - Prevent unsafe vaccination recommendations and duplicate event conflicts
- [x] TECH-004-010 Prevent unsafe vaccination recommendations and duplicate event conflicts
  - **Category:** Bug Prevention
  - **Description:** Protect the calendar engine from producing unsafe or conflicting vaccine events. This includes future-dated history, duplicate vaccination entries inside a short window, adult dogs with no history, and travel scenarios between AR and UY that require rabies documentation checks. The aim is to keep the engine deterministic and conservative whenever the input data is incomplete or contradictory.
  - **Acceptance Criteria:**
    - Duplicate vaccine records within the defined window are detected and surfaced clearly.
    - Future-dated vaccine history is rejected or flagged as impossible.
    - Travel-related rabies checks are represented in the output when relevant.
    - Unsafe recommendations are marked pending vet validation instead of confirmed.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-009
  - **File changes:** `backend/src/services/ValidationService.js`, `backend/src/services/VaccineRulesEngine.js`, `backend/src/routes/calendar.js`
  - **Estimated hours:** 6
  - **Risk level:** High
  - **Test scenarios:**
    - Enter two vaccine records of the same type within the duplicate window and verify the conflict is flagged.
    - Enter a future vaccination date and verify the calendar marks it invalid.
    - Mark a dog as traveling between AR and UY and verify rabies documentation logic appears.

### TECH-004-011 - Add calendar engine unit tests for age and boundary behavior
- [x] TECH-004-011 Add calendar engine unit tests for age and boundary behavior
  - **Category:** Testing
  - **Description:** Write focused unit and integration tests that prove the calendar engine behaves correctly for the edge cases that matter most. This includes puppy booster timing, adult catch-up schedules, rabies timing in both countries, senior-dog review cadence, and the vet-validation state. The tests should be specific enough to guard against regressions when the rules evolve.
  - **Acceptance Criteria:**
    - Tests cover puppy, adult, and senior life-stage branches.
    - Tests cover the no-history and incomplete-history pathways.
    - Tests confirm country-specific rabies timing for AR and UY.
    - Tests confirm the output remains deterministic for the same input.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-009, TECH-004-010
  - **File changes:** `backend/tests/unit/vaccineRules.test.js` (new), `backend/tests/integration/calendar-generation.test.js` (new), `backend/tests/contract/calendar-contract.test.js` (new)
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Generate a puppy with no records and verify the booster sequence.
    - Generate an adult with missing vaccines and verify catch-up logic.
    - Run the same input twice and verify the output is identical.

## EPIC-004-004 - Deworming & Risk Calculation

Goal: convert lifestyle and environmental data into a risk profile and a practical deworming cadence that stays advisory, conservative, and easy to explain to the user.

### US-004-004 - Compute risk profile and deworming cadence from lifestyle inputs
- [x] US-004-004 Compute risk profile and deworming cadence from lifestyle inputs
  - **Category:** User Story
  - **Description:** Implement the preventive risk model that reads lifestyle, environment, and health-history inputs to classify low, medium, or high risk and to suggest a deworming cadence. The result should be understandable to the user, suitable for the summary screen, and consistent with the reminder system. Keep the logic transparent so veterinarians can override it later if needed.
  - **Acceptance Criteria:**
    - The engine classifies low, medium, and high risk using the documented factors.
    - The output suggests a deworming cadence that matches the computed risk level.
    - The summary view can display the risk badge and reason summary.
    - The logic remains advisory and never implies a prescription.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-001, TECH-004-001
  - **File changes:** `backend/src/services/RiskProfileCalculator.js` (new), `backend/src/config/riskProfiles.js` (new), `backend/src/services/BreedDatabaseService.js` (new), `frontend/src/components/onboarding/BreedSearchInput.jsx` (new)
  - **Estimated hours:** 10
  - **Risk level:** Medium
  - **Test scenarios:**
    - Compute a low-risk profile for an indoor-only dog.
    - Compute a high-risk profile for a rural/raw-diet dog.
    - Verify the deworming cadence changes when the risk level changes.

### TECH-004-012 - Add deworming models and summary UI outputs
- [x] TECH-004-012 Add deworming models and summary UI outputs
  - **Category:** Technical Task
  - **Description:** Add the data structures and summary components needed to show deworming history and the computed cadence. This includes the deworming event model, the history form, and the badge or card on the summary screen. Keep the wording general and avoid any medication dosage or brand suggestions so the UI stays within the advisory boundary.
  - **Acceptance Criteria:**
    - Deworming history can be captured and rendered on the summary screen.
    - The summary output includes the risk badge and deworming guidance text.
    - No dosage or brand-name language is introduced into the UI.
    - The output can be reused by the reminder layer without reshaping.
  - **T-shirt sizing:** M
  - **Dependencies:** US-004-004, TECH-004-011
  - **File changes:** `backend/src/models/DewormingEvent.js`, `frontend/src/components/onboarding/DewormingHistoryForm.jsx` (new), `frontend/src/components/calendar/RiskProfileBadge.jsx` (new), `frontend/src/pages/OnboardingSummaryPage.jsx`
  - **Estimated hours:** 8
  - **Risk level:** Medium
  - **Test scenarios:**
    - Save a deworming record and confirm it appears in the summary.
    - Render the risk badge for each risk level.
    - Verify the summary copy stays generic and advisory.

### TECH-004-013 - Prevent risk-score undercounting for high-exposure edge cases
- [x] TECH-004-013 Prevent risk-score undercounting for high-exposure edge cases
  - **Category:** Bug Prevention
  - **Description:** Make sure the risk calculator does not accidentally classify high-exposure dogs as low risk when several moderate factors stack together. This task should explicitly cover raw diet, rural visits, standing water, contact with rodents or wildlife, flea/tick frequency, and households with multiple dogs. It should also force a vet-validation warning when the user has no regular veterinarian and the risk level is elevated.
  - **Acceptance Criteria:**
    - Combined exposure factors can raise the risk level even if each one alone is borderline.
    - High-risk inputs trigger vet-validation guidance when no veterinarian is known.
    - Raw diet and rural exposure increase parasite monitoring recommendations.
    - Edge cases are handled consistently between frontend and backend logic.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-012
  - **File changes:** `backend/src/services/RiskProfileCalculator.js`, `backend/src/services/ValidationService.js`, `frontend/src/pages/OnboardingSummaryPage.jsx`
  - **Estimated hours:** 6
  - **Risk level:** High
  - **Test scenarios:**
    - Combine raw diet plus rural exposure and verify the risk level rises.
    - Mark no veterinarian and high exposure and verify vet-validation guidance appears.
    - Add multiple medium factors and verify they do not collapse back to low risk.

### TECH-004-014 - Add unit tests for risk scoring and deworming cadence
- [x] TECH-004-014 Add unit tests for risk scoring and deworming cadence
  - **Category:** Testing
  - **Description:** Write deterministic tests for the risk model and deworming cadence so the calculated outputs remain stable as the rule set evolves. Focus the tests on factor combinations, boundary cases, and the cadence mapping from low/medium/high to the planned follow-up cadence. These tests should be easy to read and should make the rule reasoning obvious to future maintainers.
  - **Acceptance Criteria:**
    - Tests cover at least one case for each risk level.
    - Tests cover a combined-factor edge case that changes the risk score.
    - Tests verify the deworming cadence mapping for each risk level.
    - Test fixtures are small and can be reused by calendar and reminder tests.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-012, TECH-004-013
  - **File changes:** `backend/tests/unit/riskProfileCalculator.test.js` (new), `backend/tests/unit/dewormingSchedule.test.js` (new)
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Verify a low-risk profile returns the low cadence.
    - Verify a high-risk profile returns the high cadence.
    - Verify a combined-factor case does not regress to the wrong bucket.

## EPIC-004-005 - Reminder System Integration

Goal: turn generated preventive events into scheduled reminders that fit the existing dashboard and delivery pipeline without creating duplicate or unsafe notifications.

### US-004-005 - Integrate calendar events with the reminder delivery system
- [x] US-004-005 Integrate calendar events with the reminder delivery system
  - **Category:** User Story
  - **Description:** Connect the new vaccine, deworming, and appointment events to the reminder pipeline so they appear in the dashboard preview and eventually fire through the existing notification job. The implementation should keep dedupe behavior, support time-zone-aware scheduling, and respect event statuses such as pending vet validation or discarded. This story closes the loop between calendar generation and user notifications.
  - **Acceptance Criteria:**
    - Generated events can be consumed by the reminder builder without schema translation hacks.
    - The dashboard reminder preview shows calendar-derived events.
    - Reminder scheduling respects user timezone and notification preferences.
    - Duplicate notifications are avoided for the same event and channel.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-003, US-004-004, TECH-004-009, TECH-004-012
  - **File changes:** `backend/src/services/reminderFullList.js`, `backend/src/services/ReminderJob.js`, `backend/src/routes/reminders.js`, `backend/src/models/User.js`
  - **Estimated hours:** 10
  - **Risk level:** High
  - **Test scenarios:**
    - Create one vaccine event, one deworming event, and one appointment and verify they appear in reminders.
    - Confirm timezone-aware reminder scheduling uses the user profile.
    - Confirm dashboard preview still renders when no reminders are due.

### TECH-004-015 - Extend notification scheduling and dedupe behavior
- [x] TECH-004-015 Extend notification scheduling and dedupe behavior
  - **Category:** Technical Task
  - **Description:** Update the notification job and helper utilities so reminders can be scheduled once, deduped reliably, and sent through the existing email channel without duplicate retries. This task should produce stable dedupe keys and ensure that status changes such as completed, postponed, or discarded stop future sends. Keep the logic incremental so the current reminder system continues to work for existing medication and appointment reminders.
  - **Acceptance Criteria:**
    - Dedupe keys are generated consistently for all reminder types.
    - Completed or discarded events stop producing future reminder sends.
    - The reminder job continues to process the existing reminder categories.
    - Time-based scheduling uses a single shared UTC source of truth.
  - **T-shirt sizing:** L
  - **Dependencies:** US-004-005, TECH-004-013
  - **File changes:** `backend/src/services/ReminderJob.js`, `backend/src/utils/timeUtils.js`, `backend/src/services/EmailService.js`, `backend/src/services/reminderSort.js`
  - **Estimated hours:** 8
  - **Risk level:** Medium
  - **Test scenarios:**
    - Run the reminder job twice for the same event and verify only one send path is taken.
    - Mark an event completed and verify it stops producing reminders.
    - Verify the UTC source is used when computing due dates.

### TECH-004-016 - Prevent duplicate or stale reminders from leaking into the dashboard
- [x] TECH-004-016 Prevent duplicate or stale reminders from leaking into the dashboard
  - **Category:** Bug Prevention
  - **Description:** Add guardrails so the dashboard and reminder preview never show duplicate, stale, or invalid entries. This includes filtering out discarded events, skipping pending-vet-validation items when they should not notify yet, and ensuring overdue logic still behaves correctly. The task should also keep the full-list preview aligned with the delivery system so users do not see inconsistent states in different parts of the app.
  - **Acceptance Criteria:**
    - Duplicate entries with the same dedupe key are collapsed or blocked.
    - Discarded and not-yet-valid events do not trigger user-facing reminders.
    - Overdue entries still appear with the correct status label.
    - The preview and the delivery pipeline use the same eligibility rules.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-015
  - **File changes:** `backend/src/services/reminderFullList.js`, `backend/src/routes/reminders.js`, `backend/src/services/ReminderJob.js`
  - **Estimated hours:** 6
  - **Risk level:** High
  - **Test scenarios:**
    - Add two reminders with the same dedupe key and verify only one is shown.
    - Mark a reminder discarded and verify it disappears from delivery logic.
    - Mark a reminder overdue and verify the overdue status remains visible.

### TECH-004-017 - Add reminder integration tests for dedupe, overdue, and preview parity
- [x] TECH-004-017 Add reminder integration tests for dedupe, overdue, and preview parity
  - **Category:** Testing
  - **Description:** Create integration tests that prove the reminder pipeline and dashboard preview stay in sync once the new calendar events are introduced. Cover dedupe behavior, overdue handling, and status-based filtering. These tests are the main safeguard against regressions where users see different reminder sets in different screens or receive duplicate notifications.
  - **Acceptance Criteria:**
    - Tests confirm reminder preview and delivery eligibility use the same rules.
    - Tests confirm overdue items still appear correctly.
    - Tests confirm duplicate events are deduped or rejected.
    - Tests include at least one pending vet validation scenario.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-015, TECH-004-016
  - **File changes:** `backend/tests/integration/reminder-integration.test.js` (new), `backend/tests/contract/reminder-contract.test.js` (new)
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Build a mixed reminder set and verify the preview matches delivery eligibility.
    - Add an overdue reminder and verify it stays visible.
    - Add a pending-vet-validation reminder and verify it stays blocked from delivery.

## EPIC-004-006 - Testing & Deployment

Goal: harden the feature for release with safety copy, accessibility, i18n, quickstart coverage, and deployment validation.

### US-004-006 - Prepare the feature for safe rollout and operational support
- [x] US-004-006 Prepare the feature for safe rollout with safety copy, documentation, and operational support
  - **Category:** User Story
  - **Description:** Finish the feature with the release-facing work needed for a safe rollout. The user story should ensure the onboarding and calendar experience is understandable in ES first, remains accessible, and carries the mandatory veterinarian disclaimer and emergency guidance everywhere it appears. It should also produce the release notes and quickstart steps so the team can validate the feature manually after deployment.
  - **Acceptance Criteria:**
    - Safety copy is present wherever the user sees clinical guidance.
    - Release notes and quickstart documentation are ready for the feature branch.
    - The flow is accessible enough for keyboard and screen-reader use.
    - The feature can be rolled out and validated with a documented checklist.
  - **T-shirt sizing:** M
  - **Dependencies:** US-004-002, US-004-003, US-004-004, US-004-005
  - **File changes:** `specs/004-dog-onboarding-vaccination-calendar/quickstart.md` (new), `docs/release-notes/004-dog-onboarding-vaccination-calendar.md` (new), `frontend/src/i18n/I18nProvider.jsx`, `backend/src/middleware/errorHandler.js`
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Review the flow in ES and confirm the disclaimer is visible in every key screen.
    - Walk through the manual quickstart checklist after a local build.
    - Verify the emergency alert copy is clear and action-oriented.

### TECH-004-018 - Finalize accessibility, i18n, and safety copy consistency
- [x] TECH-004-018 Finalize accessibility, i18n, and safety copy consistency
  - **Category:** Technical Task
  - **Description:** Review all user-facing strings for consistency, make sure the new onboarding and calendar screens follow the existing accessibility patterns, and align the safety copy across frontend and backend responses. Keep the wording advisory only and avoid language that sounds diagnostic or prescriptive. This work is the last pass before release and should eliminate rough edges in the final user experience.
  - **Acceptance Criteria:**
    - Key onboarding and calendar screens have accessible labels and semantic structure.
    - Safety and disclaimer copy match between frontend and backend.
    - i18n strings are present for the feature's main screens and alerts.
    - No user-facing string suggests diagnosis or medication dosing.
  - **T-shirt sizing:** M
  - **Dependencies:** US-004-006
  - **File changes:** `frontend/src/i18n/I18nProvider.jsx`, `frontend/src/i18n/reminders-full-list.json`, `frontend/src/pages/DogOnboardingPage.jsx`, `frontend/src/pages/OnboardingSummaryPage.jsx`, `frontend/src/components/onboarding/DisclosureWarning.jsx`, `frontend/src/components/onboarding/RedFlagAlert.jsx`
  - **Estimated hours:** 8
  - **Risk level:** Medium
  - **Test scenarios:**
    - Run through the screens with keyboard-only navigation and verify focus states are usable.
    - Check the disclaimer and emergency copy across every screen.
    - Verify the app still renders correctly in both ES and EN language modes.

### TECH-004-019 - Block unsafe clinical wording and release regressions
- [x] TECH-004-019 Block unsafe clinical wording and release regressions
  - **Category:** Bug Prevention
  - **Description:** Add a final safety sweep to ensure no path in the onboarding, calendar, reminder, or release content introduces diagnosis language, dosage instructions, or other unsafe claims. This task should cover the feature flag path, fallback error handlers, and summary pages so the product always reads as educational and vet-guided. The focus is on preventing regressions before the feature reaches users.
  - **Acceptance Criteria:**
    - No user-facing path contains dosage or diagnosis language.
    - Emergency guidance remains advisory and points to veterinary care.
    - Feature-flagged and fallback states still show the disclaimer.
    - The release notes do not promise clinical accuracy beyond the spec.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-018
  - **File changes:** `frontend/src/pages/FullRemindersListPage.jsx`, `frontend/src/pages/OnboardingSummaryPage.jsx`, `backend/src/routes/onboarding.js`, `backend/src/services/CalendarEngine.js`, `backend/src/middleware/errorHandler.js`
  - **Estimated hours:** 4
  - **Risk level:** High
  - **Test scenarios:**
    - Search rendered copy for dosage language and verify none appears.
    - Trigger an error path and confirm the disclaimer still shows.
    - Toggle feature flags and verify the fallback content is still safe.

### TECH-004-020 - Add smoke tests, build checks, and deployment validation
- [x] TECH-004-020 Add smoke tests, build checks, and deployment validation
  - **Category:** Testing
  - **Description:** Put a final validation layer around the feature so the team can ship with confidence. Cover the local build, the main onboarding journey, calendar generation, reminder preview, and a minimal deployment smoke test. The goal is not to exhaustively retest every branch but to confirm that the integrated feature is working end to end and ready for a release branch or feature-flagged deploy.
  - **Acceptance Criteria:**
    - The build succeeds with the new onboarding and calendar files included.
    - A smoke test confirms the main onboarding-to-calendar path works.
    - A smoke test confirms reminder preview still renders after calendar creation.
    - The deployment checklist references the exact validation steps to run.
  - **T-shirt sizing:** M
  - **Dependencies:** TECH-004-018, TECH-004-019
  - **File changes:** `backend/tests/integration/deployment-smoke.test.js` (new), `frontend/src/test/e2e/onboarding-calendar.smoke.test.jsx` (new), `specs/004-dog-onboarding-vaccination-calendar/quickstart.md`, `docs/release-notes/004-dog-onboarding-vaccination-calendar.md`
  - **Estimated hours:** 6
  - **Risk level:** Medium
  - **Test scenarios:**
    - Run the main onboarding flow through calendar generation and confirm it completes.
    - Verify a reminder preview still loads after a successful onboarding.
    - Run a minimal build or smoke pass and confirm no missing-file regressions.

## Effort Summary

| Phase | Epics | Approx. Hours | Notes |
|---|---|---:|---|
| Phase 1 Critical MVP | 001-003 | 120 | Foundation, onboarding flow, calendar engine |
| Phase 2 Core | 004-005 | 60 | Risk/deworming logic and reminder integration |
| Phase 3 Polish | 006 | 24 | Safety, accessibility, release validation |
| Total | 6 epics | 204 | Keep each task small and independently testable |

## Story Point Summary

| Story | Size | Notes |
|---|---|---|
| US-004-001 | XL | Contract and persistence foundation |
| US-004-002 | XL | Multi-step onboarding UI |
| US-004-003 | XL | Calendar rules engine |
| US-004-004 | L | Risk and deworming logic |
| US-004-005 | L | Reminder integration |
| US-004-006 | M | Rollout, safety, and release support |

## Validation Rules for This Tasks File

- Every work item uses a unique ID and starts with `- [ ]`.
- Every task includes description, acceptance criteria, sizing, dependencies, file changes, hours, risk level, and test scenarios.
- Every epic has at least one user story, one implementation task, one bug-prevention task, and one testing task.
- Frontend tasks depend on API contracts or backend payload shape.
- Calendar tasks depend on the data model and validation layer.
- Reminder tasks depend on generated events and status handling.
- Deployment tasks depend on all preceding tests and safety checks.
