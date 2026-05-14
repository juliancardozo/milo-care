# Data Model: Full-List and Look-Ahead Precedence

## Scope

This feature clarifies and documents the behavior of the full reminders list and look-ahead window precedence rules. No new persistent data models are introduced; behavior is computed and validated against existing reminder data.

## Entities (Clarified Behaviors)

### Look-Ahead Window Resolution

- Purpose: Determine which reminders to include based on temporal filtering.
- Precedence order (evaluated in sequence):
  1. **Temporary current-view value** (e.g., user selected "show next 14 days"): applied first if present
  2. **Saved user preference**: applied if no temporary value and user has a preference stored
  3. **Default value**: 7 days if no temporary value and no preference
- Window measurement: from current exact time in UTC (now)
- Valid bounds: 1 to 60 days inclusive
- Invalid handling: ignored; fallback to 7-day default with user-facing explanation

### Full-List Reminder Set Computation

- Purpose: Generate complete set of eligible reminders for display.
- Source: Project from existing vaccination, medication, appointment records (inherited from feature 002)
- Filtering:
  - Include all reminders with `dueAt` <= now + (resolved window days)
  - Include all overdue undismissed reminders regardless of window
- Sorting (primary to secondary):
  1. By `dueAt` ascending (urgent first)
  2. By `sourceType` priority: vaccination (1) < medication (2) < appointment (3)
  3. By `sourceId` (record ID) ascending or record name alphabetically for stability
- Return format: single response (no pagination); all eligible items in one payload

### Eligible Reminder Set Properties

- Cardinality: 0 to N reminders per user per request
- Items labeled with: dog name, reminder type, due date/time, record reference, guidance text (inherit from 002)
- Empty state: clear message when set is empty and no overdue items exist
- Overdue state: reminders past due but not dismissed marked distinctly

## Relationships

- One User has many ReminderListViewContexts (one per dashboard view or full-list page instance)
- One ReminderListViewContext produces one EligibleReminderSet
- Existing User-to-Pet, Pet-to-Vaccination/Medication/Appointment relationships unchanged

## Invariants

- Window precedence always resolves to a valid value (1-60 days)
- Overdue undismissed reminders always included
- Eligible set is deterministic (same inputs = same output, same order)
- No new reminder data is persisted; behavior is read-only and computed
