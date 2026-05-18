# Feature Specification: Reminder Full-List and Look-Ahead Precedence Clarification

**Feature Branch**: `003-clarify-fr011-precedence`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "to clarify FR-011 full-list behavior and look-ahead precedence"

## Clarifications

### Session 2026-05-14

- Q: How should "View all" return the complete reminders list? -> A: Option A (show all reminders in a single response without pagination)
- Q: How should system handle invalid look-ahead window values? -> A: Option B (ignore invalid value and use 7-day default)
- Q: How should full-list reminders be sorted? -> A: Option A (same as dashboard: by due date ascending, urgent first)
- Q: How should simultaneous reminders be ordered deterministically? -> A: Option B (group by type order: vaccination, medication, appointment; then by record ID/name)
- Q: How should look-ahead window be measured temporally? -> A: Option B (measured from current exact time in UTC now)

**Clarifications completed:** 5 questions asked and answered. Spec finalized and ready for planning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a Complete Reminders List from Dashboard (Priority: P1)

A dog owner selects "View all" from the dashboard reminders panel and sees a complete reminders list, not only the top 5 urgent reminders.

**Why this priority**: This is the direct clarification target of FR-011 and removes the largest ambiguity that blocks implementation and testing.

**Independent Test**: A user with more than 5 reminders can open the full list and verify that every eligible reminder is visible.

**Acceptance Scenarios**:

1. **Given** a user has more than 5 eligible reminders, **When** the user selects "View all" from the dashboard panel, **Then** the system opens a full reminders list that includes all eligible reminders.
2. **Given** a user has reminders for multiple dogs and reminder types, **When** the full list is displayed, **Then** each reminder clearly shows dog name, reminder type, and due date/time.
3. **Given** a user has no eligible reminders, **When** the user opens the full list, **Then** the user sees a clear empty-state message.

---

### User Story 2 - Apply Deterministic Look-Ahead Window Rules (Priority: P1)

A dog owner sees consistent reminder results because look-ahead precedence rules are explicit and always applied in the same order.

**Why this priority**: Precedence ambiguity causes inconsistent outcomes and makes FR-003 and FR-011 difficult to validate.

**Independent Test**: A tester can set each precedence input and confirm the resulting reminder list is deterministic.

**Acceptance Scenarios**:

1. **Given** a temporary window value is chosen for the current list view, **When** reminders are loaded, **Then** the current-view value is applied first.
2. **Given** no temporary current-view value exists and the user has a saved reminder window preference, **When** reminders are loaded, **Then** the saved preference is applied.
3. **Given** neither a temporary current-view value nor a saved preference exists, **When** reminders are loaded, **Then** the default 7-day window is applied.

---

### User Story 3 - Receive Predictable Results at Window Boundaries (Priority: P2)

A dog owner gets predictable inclusion and exclusion behavior for reminders at date boundaries and invalid window inputs.

**Why this priority**: Boundary behavior is necessary for trust and consistent support handling, but depends on the clarified precedence model.

**Independent Test**: A tester can validate reminders exactly on window boundaries and invalid inputs, confirming expected list membership.

**Acceptance Scenarios**:

1. **Given** a reminder due exactly at the look-ahead boundary, **When** the list is generated, **Then** the reminder is included.
2. **Given** an invalid window value outside allowed limits, **When** reminders are requested, **Then** the system ignores that value, applies the 7-day default window, and presents a clear user-facing explanation.
3. **Given** overdue reminders exist, **When** reminders are listed, **Then** overdue items remain included regardless of look-ahead window value until dismissed.

---

### Edge Cases

- User opens full list with mixed overdue and upcoming reminders; ordering remains clear and stable.
- User changes the look-ahead value while viewing the full list; results refresh using the new value without losing context.
- User has reminders clustered on the same date/time; list remains deterministic.
- User has no dog profiles; full list shows onboarding guidance instead of a generic empty state.
- User switches language; reminder labels and explanatory text remain consistent in meaning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define "View all" as navigation to a complete reminders list for the same user context as the dashboard panel.
- **FR-002**: The complete reminders list MUST include all eligible reminders, not only the top 5 shown in the dashboard panel.
- **FR-002a**: Full-list mode MUST return all eligible reminders in a single response without pagination.
- **FR-003**: The complete reminders list MUST preserve reminder identity fields required for user action (dog name, reminder type, due date/time, and record reference).
- **FR-004**: The system MUST apply look-ahead precedence in this order: current-view temporary value, then saved user preference, then default value.
- **FR-004a**: Look-ahead window MUST be measured from current exact time in UTC (now), not from start or end of calendar day.
- **FR-005**: The default look-ahead window MUST be 7 days when higher-precedence values are not available.
- **FR-006**: Overdue and undismissed reminders MUST remain included regardless of look-ahead window.
- **FR-007**: The system MUST define valid look-ahead bounds as 1 to 60 days.
- **FR-008**: If an invalid look-ahead value is provided, the system MUST ignore the invalid value and apply the 7-day default, and provide clear user-facing feedback explaining the applied default.
- **FR-009**: A reminder due exactly on the look-ahead boundary MUST be included in results.
- **FR-009a**: Full-list reminders MUST be sorted by due date ascending (earliest/most urgent first), matching dashboard panel sort order.
- **FR-009b**: When two or more reminders have identical due dates, system MUST apply secondary sort: by reminder type order (vaccination → medication → appointment), then by record ID/name to ensure deterministic ordering.
- **FR-010**: The complete reminders list MUST support all dashboard reminder categories already in scope (vaccinations, medications, appointments).
- **FR-011**: Clarified FR-011 behavior MUST be testable independently from dismissal behavior.
- **FR-012**: The specification MUST remain aligned with existing reminder safety constraints, including non-diagnostic guidance and recommendation to consult a trusted veterinarian.

### Key Entities *(include if feature involves data)*

- **Reminder List View Context**: A user-scoped context that determines which reminder set is shown, including selected look-ahead value and active filters for the current view.
- **Look-Ahead Window Source**: A resolved source indicator identifying whether window value came from temporary current-view input, saved preference, or default fallback.
- **Eligible Reminder Set**: The complete set of reminders visible in full-list mode after applying precedence, boundary rules, and overdue inclusion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested "View all" flows with more than 5 reminders open a complete reminders list containing all eligible reminders.
- **SC-002**: In precedence validation tests, resolved look-ahead source matches defined order in 100% of scenarios.
- **SC-003**: Boundary-condition tests confirm inclusive boundary behavior and overdue inclusion in 100% of scenarios.
- **SC-004**: Clarification-related support questions about "View all" scope and look-ahead precedence are reduced by at least 50% in the first release cycle after rollout.

## Assumptions

- Existing reminder categories and reminder generation logic remain unchanged; this feature clarifies scope and precedence behavior.
- Existing reminder dismissal behavior remains unchanged and out of primary scope except where needed for eligibility definitions.
- The current product remains Spanish-priority bilingual and continues using existing localization patterns.
- Clarification artifacts are intended to unblock planning and implementation tasks, not to redesign unrelated reminder features.
