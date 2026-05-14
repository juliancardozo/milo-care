---
description: "Executable task checklist for full-list and look-ahead precedence clarification"
---

# Tasks: Reminder Full-List and Look-Ahead Precedence Clarification

**Input**: Design documents from `/specs/003-clarify-fr011-precedence/`  
**Prerequisites**: plan.md (required), spec.md (user stories), research.md (decisions), data-model.md (entities), contracts/full-list-api.yaml, quickstart.md

**Tests**: Contract and integration tests included (TDD approach). Tests MUST be written first and verified to fail before implementation.

**Organization**: Tasks are grouped by user story (US1, US2, US3) to enable independent implementation and testing of each story. Each story is independently testable and deliverable.

## Format: `[ID] [P?] [Story?] Description with file path`

- **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
- **[ID]**: Sequential task ID (T001, T002, T003...)
- **[P]**: Parallelizable tasks (different files, no blocking dependencies)
- **[Story]**: User story label (US1, US2, US3) for story-phase tasks only
- Include exact file paths for each task

## Path Conventions

**Web app structure** (from plan.md):
```
backend/src/ → routes, services, models
frontend/src/ → components, pages, services
tests/ → contract, integration tests
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify feature branch `003-clarify-fr011-precedence` is active and synced with `002-dashboard-reminders-panel`
- [ ] T002 Review existing reminder data model and filtering logic from feature 002 (backend/src/models/Reminder.js and frontend/src/services/reminderService.ts)
- [ ] T003 Create directory structure for full-list feature: backend/src/services/reminderFullList.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core window-resolution logic that BOTH user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement look-ahead window precedence resolver in backend/src/services/windowResolution.js
  - Resolve window value from: current-view temporary param → user preference → 7-day default
  - Validate bounds (1-60 days)
  - Return { windowDays, windowSource, appliedAt }
- [ ] T005 Implement invalid-window fallback handler in backend/src/services/windowResolution.js
  - When windowDays < 1 or > 60, apply 7-day default
  - Generate user-facing explanation message
- [ ] T006 Create UTC-based time reference utility in backend/src/utils/timeUtils.js
  - Function: getUTCNow() → ISO 8601 UTC timestamp
  - Used by window calculation and boundary checks
- [ ] T007 Implement deterministic reminder sort function in backend/src/services/reminderSort.js
  - Primary: by dueAt ascending
  - Secondary: by sourceType order (vaccination=1, medication=2, appointment=3)
  - Tertiary: by sourceId/sourceName ascending
- [ ] T008 Create unit tests for window resolution in backend/tests/unit/windowResolution.test.js
  - Test precedence order (temporary > preference > default)
  - Test boundary validation
  - Test invalid input fallback
  - All tests must FAIL before implementation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Open a Complete Reminders List from Dashboard (Priority: P1) 🎯 MVP

**Goal**: Users can click "View all" from dashboard panel and see complete reminders list (all eligible items, single response, no pagination)

**Independent Test**: A user with more than 5 reminders can open the full list and verify every eligible reminder is visible with correct dog name, type, and due date

### Contract Tests for User Story 1 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T009 [P] [US1] Contract test for GET /api/dashboard/reminders/full endpoint in backend/tests/contract/reminders-full-list.test.js
  - Verify response schema matches OpenAPI spec (reminders[], total, windowDays, windowSource, appliedAt)
  - Verify response includes all eligible reminder fields (id, sourceType, sourceId, petId, petName, title, dueAt, status)
  - Verify empty array when no reminders match criteria

### Integration Tests for User Story 1 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T010 [P] [US1] Integration test for "View all" journey in backend/tests/integration/full-list.test.js
  - Setup: Create user with 8 reminders across 2 dogs and 3 types
  - Verify GET /api/dashboard/reminders/full returns all 8 reminders
  - Verify GET with ?windowDays=14 filters correctly
  - Verify SC-001 measurable outcome: 100% of eligible reminders visible

### Implementation for User Story 1

- [ ] T011 [US1] Implement eligibility filter in backend/src/services/reminderFullList.js
  - Query all undismissed reminders for user (Vaccination, Medication, Appointment models)
  - Filter by: dueAt <= now + windowDays OR overdue + undismissed
  - Return complete Eligible Reminder Set
- [ ] T012 [US1] Implement full-list API endpoint in backend/src/routes/reminders.js
  - GET /api/dashboard/reminders/full
  - Accept query params: windowDays (optional), includeOverdue (optional, default true)
  - Call windowResolution → filter → sort → return with metadata
- [ ] T013 [US1] Add error handling and logging for full-list endpoint in backend/src/routes/reminders.js
  - Handle invalid windowDays parameter
  - Log response count, window source, and execution time
- [ ] T014 [P] [US1] Create frontend full-list service in frontend/src/services/reminderFullListService.ts
  - Async function: fetchFullRemindersList(windowDays?: number) → ReminderItem[]
  - Call backend GET /api/dashboard/reminders/full
  - Handle errors and network retries
- [ ] T015 [P] [US1] Create FullRemindersListPage component in frontend/src/pages/FullRemindersListPage.tsx
  - Display all reminders returned from API
  - Show dog name, type, due date for each reminder
  - Show empty-state message when no reminders
- [ ] T016 [P] [US1] Add "View all" link to dashboard reminders panel in frontend/src/components/DashboardRemindersPanel.tsx
  - Link navigates to FullRemindersListPage
  - Label: "View all reminders"
- [ ] T017 [US1] Implement accessibility for full-list page (ARIA labels, semantic HTML in frontend/src/pages/FullRemindersListPage.tsx)
- [ ] T018 [US1] Add i18n support for full-list strings (ES + EN) in frontend/src/i18n/reminders-full-list.json
  - "View all" link text
  - "No reminders" empty-state message
  - Column headers: Dog, Type, Due Date

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Apply Deterministic Look-Ahead Window Rules (Priority: P1)

**Goal**: System consistently applies look-ahead precedence rules in explicit order: current-view > saved preference > 7-day default

**Independent Test**: Tester can set each precedence input level and confirm resulting reminder list is deterministic and matches precedence order

### Contract Tests for User Story 2 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T019 [P] [US2] Contract test for window precedence resolution in backend/tests/contract/window-precedence.test.js
  - Verify temporary-override parameter takes precedence over all
  - Verify user preference is applied when no override
  - Verify default 7 days when neither override nor preference
  - Verify windowSource metadata in response matches resolved precedence level

### Integration Tests for User Story 2 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T020 [P] [US2] Integration test for precedence scenarios in backend/tests/integration/precedence-rules.test.js
  - Scenario A: Override param only → temporary-override
  - Scenario B: Saved preference only → user-preference
  - Scenario C: Both override and preference → override wins
  - Scenario D: Neither → default
  - Verify SC-002 measurable outcome: 100% precedence matching in all scenarios

### Implementation for User Story 2

- [ ] T021 [US2] Implement user preference storage in backend/src/models/User.js
  - Add field: `reminderWindowPreference` (number, 1-60, default null)
  - Create getter/setter for user window preference
- [ ] T022 [US2] Extend full-list endpoint to accept windowDays parameter in backend/src/routes/reminders.js (from T012)
  - Query param ?windowDays=N overrides user preference
  - Resolution logic: check param first, then user preference, then default
- [ ] T023 [P] [US2] Create frontend settings component for window preference in frontend/src/components/ReminderWindowPreference.tsx
  - User can set preferred window value (1-60 days)
  - Save preference to backend PATCH /api/user/preferences/reminderWindow
- [ ] T024 [US2] Add PATCH endpoint to persist user window preference in backend/src/routes/users.js
  - PATCH /api/user/preferences/reminderWindow
  - Accept { reminderWindowDays: number }
  - Validate bounds (1-60)
  - Update User.reminderWindowPreference
- [ ] T025 [US2] Implement determinism verification test in backend/tests/integration/determinism.test.js
  - Run same query 10 times; verify identical ordering every time
  - Verify SC-002: Resolved window source always matches precedence order

**Checkpoint**: User Stories 1 AND 2 both work independently; deterministic behavior verified

---

## Phase 5: User Story 3 - Receive Predictable Results at Window Boundaries (Priority: P2)

**Goal**: Users get predictable inclusion/exclusion behavior at date boundaries and invalid inputs; overdue items always included

**Independent Test**: Tester can validate reminders exactly on window boundaries and with invalid inputs, confirming expected list membership

### Contract Tests for User Story 3 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T026 [P] [US3] Contract test for boundary conditions in backend/tests/contract/boundary-conditions.test.js
  - Reminder due exactly at window boundary is INCLUDED
  - Reminder 1 second past boundary is EXCLUDED
  - Reminder 1 second before boundary is INCLUDED
  - Overdue undismissed reminder is INCLUDED regardless of window

### Integration Tests for User Story 3 (WRITE FIRST, MUST FAIL INITIALLY) ⚠️

- [ ] T027 [P] [US3] Integration test for boundary and overdue scenarios in backend/tests/integration/boundary-edge-cases.test.js
  - Scenario A: Reminder exactly at now+7days → included
  - Scenario B: Reminder at now+7days+1ms → excluded
  - Scenario C: Overdue undismissed with window=1 day → included
  - Scenario D: Invalid windowDays=100 → 7-day default applied with explanation
  - Verify SC-003 measurable outcome: 100% boundary and overdue inclusion correct

### Implementation for User Story 3

- [ ] T028 [US3] Implement inclusive boundary check in backend/src/services/reminderFullList.js
  - Filter logic: dueAt <= (now + windowDays milliseconds) OR (overdue AND undismissed)
  - Boundary: Use exact UTC timestamp comparison (not calendar days)
- [ ] T029 [US3] Add boundary-inclusive logic unit test in backend/tests/unit/boundaryLogic.test.js
  - Test reminder exactly at boundary (microsecond precision)
  - Test overdue inclusion logic
  - Verify inclusive boundary behavior
- [ ] T030 [P] [US3] Add invalid-window error message to frontend full-list page in frontend/src/pages/FullRemindersListPage.tsx
  - When API response includes error message for invalid windowDays
  - Display user-facing explanation (e.g., "Invalid window. Using default 7 days.")
  - Style as non-blocking warning (not error)
- [ ] T031 [US3] Implement overdue indicator/styling in frontend/src/components/ReminderItem.tsx
  - Mark overdue reminders distinctly (color, icon, or badge)
  - Add aria-label: "Overdue"
- [ ] T032 [US3] Add overdue reminders to i18n in frontend/src/i18n/reminders-full-list.json
  - Label: "Overdue reminder"
  - Explanation: "This reminder is past due. Please take action or dismiss."

**Checkpoint**: All user stories (US1, US2, US3) are independently functional and fully testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, observability, documentation, and release readiness

- [ ] T033 [P] Add performance monitoring to full-list endpoint in backend/src/routes/reminders.js
  - Measure query time, filter time, sort time
  - Log if any step exceeds 100ms
  - Verify SC-001 performance goal: full-list load <= 2s
- [ ] T034 [P] Implement E2E manual test steps in specs/003-clarify-fr011-precedence/quickstart.md validation
  - Execute all 5 scenarios (A-E) from quickstart.md
  - Verify results match expected behavior
  - Document any deviations
- [ ] T035 [P] Add feature flag for full-list rollout in backend/src/config/featureFlags.js (optional)
  - Feature flag: `reminderFullListEnabled` (default true)
  - Allow gradual enablement or quick disable
- [ ] T036 Create feature release notes in docs/release-notes/003-full-list.md
  - Summary: Full-list and precedence clarification
  - Breaking changes: None (backward compatible)
  - Migration: None required
  - Known limitations: Single-response (no pagination)
- [ ] T037 Update API documentation in backend/README.md
  - Add GET /api/dashboard/reminders/full endpoint
  - Include query parameters (windowDays, includeOverdue)
  - Link to contracts/full-list-api.yaml

---

## Dependencies & Execution Strategy

### Task Dependencies Graph

```
T001 (Setup) → T002, T003
    ↓
T004-T008 (Foundation - BLOCKING)
    ↓
T009-T010 (US1 Contract Tests) ┐
T011-T018 (US1 Implementation) │ Can execute in parallel
    ↓                          │ after T004-T008
T019-T020 (US2 Contract Tests) ├──────────→ All start after T008
T021-T025 (US2 Implementation) │
    ↓                          │
T026-T027 (US3 Contract Tests) │
T028-T032 (US3 Implementation) ┘
    ↓
T033-T037 (Polish)
```

### Parallel Execution Example

**After T008 (Foundation complete), execute in parallel groups:**

**Group A (US1 Frontend)**: T014, T015, T016, T017, T018  
**Group B (US1 Contract/Integration)**: T009, T010  
**Group C (US2 Contract/Integration)**: T019, T020  
**Group D (US2 Backend)**: T021, T022, T024, T025  
**Group E (US2 Frontend)**: T023  
**Group F (US3 Contract/Integration)**: T026, T027  
**Group G (US3 Backend)**: T028, T029  
**Group H (US3 Frontend)**: T030, T031, T032  

All groups can proceed in parallel → T033-T037 (Polish) in series after all implementation complete.

---

## Success Criteria Validation

| Success Criterion | Validation Task | Pass Condition |
|---|---|---|
| **SC-001**: 100% of "View all" flows with >5 reminders show all eligible items | T010, T034 | All eligible reminders visible in full-list page |
| **SC-002**: Resolved window source matches precedence in 100% of scenarios | T020, T025 | Response metadata matches defined precedence order |
| **SC-003**: Boundary conditions and overdue inclusion 100% correct | T027, T029 | Inclusive boundary and overdue inclusion verified |
| **SC-004**: Clarification reduces support questions ≥50% | T034, T036 | Clear error messages and documentation reduce confusion |

---

## Story Completion Checkpoints

- **After US1 (T009-T018)**: Users can access full reminders list; T001 blocker removed
- **After US2 (T019-T025)**: Window precedence is deterministic and testable
- **After US3 (T026-T032)**: Boundary behavior is predictable and safe; edge cases handled
- **After Polish (T033-T037)**: Feature is observable, documented, and ready for release

