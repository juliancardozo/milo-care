# Tasks: Dashboard Upcoming Reminders Panel

**Input**: Design documents from `/specs/002-dashboard-reminders-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reminders-api.yaml, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create feature scaffolding in backend and frontend for the reminders panel flow.

- [ ] T001 Create dashboard reminders route module scaffold in backend/src/routes/dashboardReminders.js
- [ ] T002 Create dashboard reminder service module scaffold in backend/src/services/DashboardReminderService.js
- [ ] T003 [P] Create upcoming reminder card component scaffold in frontend/src/components/UpcomingReminderCard.jsx
- [ ] T004 [P] Create upcoming reminders panel component scaffold in frontend/src/components/UpcomingRemindersPanel.jsx
- [ ] T005 [P] Add dashboard reminders API client methods scaffold in frontend/src/services/api.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared data and configuration primitives required by all user stories.

**CRITICAL**: Complete this phase before user story implementation.

- [ ] T006 Create ReminderDismissal persistence model with unique userId+reminderKey index in backend/src/models/ReminderDismissal.js
- [ ] T007 Create AR/UY country clinical template configuration in backend/src/config/clinicalTemplates.js
- [ ] T008 [P] Implement reminder projection utility helpers (key, status, sort, truncate) in backend/src/services/DashboardReminderService.js
- [ ] T009 [P] Register dashboard reminders routes in backend/src/app.js
- [ ] T010 [P] Add i18n labels and fallback copy for reminder panel states in frontend/src/i18n/I18nProvider.jsx
- [ ] T011 Add dashboard reminders panel mounting and initial state wiring in frontend/src/pages/DashboardPage.jsx

**Checkpoint**: Foundation ready; user stories can be implemented.

---

## Phase 3: User Story 1 - View All Upcoming Reminders at a Glance (Priority: P1)

**Goal**: Show upcoming and overdue reminders (vaccinations, medications, appointments) sorted by urgency in the dashboard panel.

**Independent Test**: Open dashboard with seeded reminders and verify visible items include type/title/due date/dog name, sorted by due date, with empty/no-dog states handled.

### Implementation for User Story 1

- [ ] T012 [US1] Implement GET /api/dashboard/reminders handler and query parsing in backend/src/routes/dashboardReminders.js
- [ ] T013 [P] [US1] Implement vaccination reminder projection extraction in backend/src/services/DashboardReminderService.js
- [ ] T014 [P] [US1] Implement medication reminder projection extraction in backend/src/services/DashboardReminderService.js
- [ ] T015 [P] [US1] Implement appointment reminder projection extraction in backend/src/services/DashboardReminderService.js
- [ ] T016 [US1] Merge projected reminders, apply overdue status, and sort/limit response in backend/src/services/DashboardReminderService.js
- [ ] T017 [US1] Implement no-dog onboarding state in reminder projection response in backend/src/services/DashboardReminderService.js
- [ ] T018 [US1] Render upcoming reminders list with 5-item cap and View all link in frontend/src/components/UpcomingRemindersPanel.jsx
- [ ] T019 [P] [US1] Render reminder card metadata fields (type, title, due date, dog name) in frontend/src/components/UpcomingReminderCard.jsx
- [ ] T020 [US1] Fetch and bind reminder projection data to dashboard panel states in frontend/src/pages/DashboardPage.jsx
- [ ] T021 [US1] Add overdue badge, empty state, and truncation styles for reminders panel in frontend/src/index.css

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Navigate from Reminder to Health Record (Priority: P2)

**Goal**: Enable one-click navigation from each reminder item to its related health record detail page.

**Independent Test**: Click each reminder type from the dashboard panel and verify navigation lands on the corresponding vaccination, medication, or appointment detail context.

### Implementation for User Story 2

- [ ] T022 [US2] Build clickTarget path mapping for vaccination, medication, and appointment reminders in backend/src/services/DashboardReminderService.js
- [ ] T023 [US2] Return clickTarget in reminder serialization contract in backend/src/routes/dashboardReminders.js
- [ ] T024 [US2] Wire reminder card click interaction to route navigation in frontend/src/components/UpcomingReminderCard.jsx
- [ ] T025 [US2] Ensure dashboard-to-detail route compatibility for reminder click-through in frontend/src/App.jsx

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Dismiss an Actioned Reminder (Priority: P3)

**Goal**: Allow users to dismiss reminders from the panel without deleting source clinical records.

**Independent Test**: Dismiss a reminder, refresh dashboard, and verify it stays hidden while source record remains intact; confirm future recurrence can reappear as a new reminder key.

### Implementation for User Story 3

- [ ] T026 [US3] Implement POST /api/dashboard/reminders/:reminderId/dismiss endpoint in backend/src/routes/dashboardReminders.js
- [ ] T027 [US3] Persist dismissal events with reason and timestamp in backend/src/models/ReminderDismissal.js
- [ ] T028 [US3] Exclude dismissed reminder keys during reminder projection assembly in backend/src/services/DashboardReminderService.js
- [ ] T029 [US3] Add dismiss reminder API client method in frontend/src/services/api.js
- [ ] T030 [US3] Add dismiss action control with optimistic item removal in frontend/src/components/UpcomingReminderCard.jsx
- [ ] T031 [US3] Reconcile dismissed reminders and recurrence reappearance behavior in frontend/src/components/UpcomingRemindersPanel.jsx

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, regional guidance, and delivery verification across all stories.

- [ ] T032 [P] Add AR/UY guidance text and mandatory trusted-veterinarian disclaimer templates in backend/src/config/clinicalTemplates.js
- [ ] T033 Add country-aware guidance rendering in reminder panel cards in frontend/src/components/UpcomingRemindersPanel.jsx
- [ ] T034 [P] Align reminders API contract examples and required fields with implementation in specs/002-dashboard-reminders-panel/contracts/reminders-api.yaml
- [ ] T035 [P] Update manual validation steps for reminders behavior in specs/002-dashboard-reminders-panel/quickstart.md
- [ ] T036 Run quickstart validation scenarios and record execution notes in specs/002-dashboard-reminders-panel/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup and blocks all user stories.
- User Story phases (Phase 3-5): depend on Foundational completion.
- Polish (Phase 6): depends on completion of all desired user stories.

### User Story Dependencies

- US1 (P1): starts after Foundational; no dependency on US2/US3.
- US2 (P2): starts after Foundational; depends on reminder item rendering from US1.
- US3 (P3): starts after Foundational; depends on reminder identity/projection from US1.

### Within Each Story

- Backend projection/contract tasks before frontend consumption.
- API wiring before UI interaction tasks.
- Story checkpoint validation before moving to next priority.

---

## Parallel Opportunities

- Phase 1: T003, T004, and T005 can run in parallel after T001/T002 scaffolds exist.
- Phase 2: T008, T009, and T010 can run in parallel after T006/T007 are created.
- US1: T013, T014, and T015 can run in parallel; T019 can run in parallel with backend aggregation.
- Polish: T032, T034, and T035 can run in parallel.

### Parallel Example: User Story 1

- Run T013, T014, and T015 together while one frontend contributor runs T019.
- Integrate outputs in T016 once all parallel projection tasks are complete.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tasks (T012-T021).
3. Validate independent US1 acceptance criteria before expanding scope.

### Incremental Delivery

1. Deliver US1 (dashboard visibility and sorting).
2. Deliver US2 (click-through actionability).
3. Deliver US3 (dismissal persistence and recurrence handling).
4. Run Polish tasks and quickstart validation for release readiness.

### Team Parallelization

1. Pair backend/frontend contributors during Setup + Foundational.
2. Split by story after Foundational: one developer on US2, another on US3, while maintaining US1 baseline.
3. Reserve one pass for cross-cutting AR/UY guidance and contract/quickstart alignment.

---

## Notes

- All tasks follow required checklist format: `- [ ] T### [P?] [US?] Description with file path`.
- [P] tasks are safe for parallel execution because they target independent concerns.
- Each user story phase is independently testable per the criteria above.
