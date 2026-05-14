# Feature Specification: Dashboard Upcoming Reminders Panel

**Feature Branch**: `002-dashboard-reminders-panel`
**Created**: 2026-05-13
**Status**: Draft
**Input**: User description: "FR-015: dashboard shows upcoming reminders panel"
**Parent Spec**: [001-milo-care-mvp/spec.md](../001-milo-care-mvp/spec.md) — FR-015

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View All Upcoming Reminders at a Glance (Priority: P1)

A dog owner opens the health dashboard and immediately sees a panel listing all upcoming health reminders for their dog(s) — vaccinations due, medications scheduled, and appointments approaching — sorted by date so the most urgent items appear first.

**Why this priority**: The reminders panel is the primary reason users return to the dashboard daily. Without it, users must navigate to each section individually to find what is coming up. The panel is the core deliverable of FR-015.

**Independent Test**: A user with at least one upcoming reminder (any type) opens the dashboard and sees that reminder in the panel with its due date and type. Read-only display is sufficient to validate this story independently.

**Acceptance Scenarios**:

1. **Given** a logged-in user has a vaccination due in 5 days, **When** they open the health dashboard, **Then** the reminders panel shows the vaccine name, the dog's name, and the due date.
2. **Given** a logged-in user has a medication dose scheduled for tomorrow, **When** they view the reminders panel, **Then** the medication name, dosage, and scheduled time are visible.
3. **Given** a logged-in user has a vet appointment in 3 days, **When** they view the reminders panel, **Then** the clinic name, appointment date, and dog's name are shown.
4. **Given** a user has multiple reminders across different types and dogs, **When** they view the reminders panel, **Then** all reminders within the look-ahead window are listed sorted by date, earliest first.
5. **Given** a user has no upcoming reminders, **When** they view the reminders panel, **Then** a clear empty-state message indicates that no reminders are due soon.

---

### User Story 2 — Navigate from a Reminder to the Health Record (Priority: P2)

A dog owner spots a reminder in the panel and clicks it to go directly to the related health record — vaccination, medication, or appointment — so they can view details, update the record, or mark it as completed without extra navigation.

**Why this priority**: Direct navigation from reminder to record eliminates friction for acting on reminders. It builds on the read-only panel from User Story 1 and adds actionability, but the panel delivers awareness value even without this.

**Independent Test**: A user can click any reminder item in the panel and arrive on the detail view for the corresponding health record in one step.

**Acceptance Scenarios**:

1. **Given** the panel shows a vaccination reminder, **When** the user clicks it, **Then** they are taken to the vaccination record detail view for that dog.
2. **Given** the panel shows a medication reminder, **When** the user clicks it, **Then** they are taken to the medication detail view for that dog.
3. **Given** the panel shows an appointment reminder, **When** the user clicks it, **Then** they are taken to the appointment detail view for that dog.

---

### User Story 3 — Dismiss an Actioned Reminder (Priority: P3)

A dog owner has already taken care of a reminder (given a medication, attended an appointment) and dismisses it from the panel so the list stays focused on what still needs attention.

**Why this priority**: Dismissal keeps the panel clean and actionable day-to-day, but the dashboard delivers its core awareness value without it.

**Independent Test**: A user can dismiss a reminder from the panel; it disappears immediately without deleting the underlying health record.

**Acceptance Scenarios**:

1. **Given** a reminder is visible in the panel, **When** the user dismisses it, **Then** it is removed from the panel and the underlying health record is unchanged.
2. **Given** a user dismisses a reminder, **When** they return to the dashboard later, **Then** the dismissed reminder does not reappear.
3. **Given** a dismissed reminder has a future recurring occurrence (e.g., a recurring medication dose), **When** the next due date falls within the look-ahead window, **Then** the next occurrence appears in the panel as a new item.

---

### Edge Cases

- **No dog profiles yet**: If the user has no dog profiles, the reminders panel displays an onboarding prompt to create a dog profile instead of an empty state.
- **Overdue reminders**: Reminders whose due date has passed but were not dismissed must appear visually distinct (e.g., labelled "Overdue") and remain in the panel until dismissed.
- **More than 5 reminders**: When more than 5 reminders are due within the window, the panel shows the 5 most urgent and provides a "View all" link to a full reminders list.
- **Multi-dog label clarity**: When a user has multiple dogs, each reminder must be clearly labelled with the dog's name to prevent confusion.
- **Long text truncation**: Long medication names or clinic names must be truncated gracefully without breaking the panel layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST display an "Upcoming Reminders" panel to all logged-in users.
- **FR-002**: The reminders panel MUST aggregate reminders from all active health record types: upcoming vaccination due dates, scheduled medication doses, and upcoming appointments.
- **FR-003**: The panel MUST display only reminders falling within the configured look-ahead window (default: 7 days), plus any overdue undismissed reminders.
- **FR-004**: Reminders in the panel MUST be sorted by due date, with the earliest date displayed first.
- **FR-005**: Each reminder item MUST display: reminder type (vaccination / medication / appointment), the relevant record name, the due date or scheduled time, and — for users with multiple dogs — the dog's name.
- **FR-006**: The panel MUST display a meaningful empty-state message when no reminders fall within the look-ahead window and there are no overdue reminders.
- **FR-007**: Each reminder item MUST be clickable, navigating the user to the detail view of the related health record.
- **FR-008**: Users MUST be able to dismiss individual reminder items from the panel; dismissal removes the item from the panel without deleting the underlying health record.
- **FR-009**: Dismissed reminders MUST NOT reappear on subsequent dashboard visits unless a new recurrence falls within the look-ahead window.
- **FR-010**: Overdue reminders (past due date, not yet dismissed) MUST be visually distinguished from upcoming reminders.
- **FR-011**: When more than 5 reminders are due, the panel MUST show the 5 most urgent and provide a "View all" link to a full reminders list.
- **FR-012**: If the user has no dog profiles, the panel MUST display an onboarding prompt to create a dog profile.

### Key Entities

- **Reminder**: A scheduled health alert derived from a vaccination due date, medication schedule, or appointment date, scoped to a specific dog. Carries a due date/time, type label, reference to the source health record, and dismissal status.
- **Dashboard Reminders Panel**: The aggregated widget on the health dashboard that surfaces all active reminder items across the logged-in user's dog profiles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All upcoming reminders for a user's dogs are visible in the panel within 2 seconds of the dashboard loading.
- **SC-002**: 80% of users who have upcoming reminders interact with the reminders panel at least once per week.
- **SC-003**: Users who regularly engage with the reminders panel return to the app at least twice as frequently as users who do not.
- **SC-004**: A user can navigate from any reminder in the panel to the corresponding health record in no more than 2 clicks.
- **SC-005**: The panel reflects the current reminder state with no more than a 1-minute staleness window after any health record is created or updated.

## Assumptions

- The look-ahead window defaults to 7 days, consistent with the vaccination notification window defined in FR-005 of the parent spec.
- The panel aggregates reminders across all of the user's dogs; each item is labelled with the dog's name when the user has more than one dog.
- The panel display limit is 5 items; a "View all" link reveals additional reminders.
- Reminder dismissal is a dashboard-level action only; it does not delete the health record or cancel any scheduled email notification.
- Medication reminders represent the next upcoming scheduled dose only, not all future doses.
- Overdue reminders remain in the panel until explicitly dismissed, prompting the user to act or acknowledge.
- The panel is read-only except for the dismissal action; editing a health record is done from the record's own detail view.
- This feature expands FR-015 from the parent spec (`001-milo-care-mvp`) and depends on the vaccination, medication, and appointment features being implemented.
