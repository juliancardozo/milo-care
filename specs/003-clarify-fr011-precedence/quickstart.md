# Quickstart: Full-List and Look-Ahead Precedence Testing

## Objective

Validate full-list behavior, window precedence resolution, deterministic ordering, and invalid-input handling.

## Prerequisites

- Backend running on port 3001
- Frontend running on port 5173
- MongoDB running (Docker or Atlas)
- Seed user with at least one dog profile
- Existing reminder records (5+ per user recommended for full-list testing)

## Setup

1. Start stack:
```bash
docker compose up
```

2. Log in to the app.

3. Ensure user profile has multiple reminders across types and dogs (seeded test data).

## Scenario A: Full-List Rendering

1. Open dashboard reminders panel.
2. If more than 5 reminders exist, locate "View all" link.
3. Click "View all".

Expected:
- Full reminders list page/modal opens.
- ALL eligible reminders visible in single view (no pagination).
- Reminders sorted by due date ascending (most urgent first).
- Each reminder shows dog name, type, and due date/time.

## Scenario B: Window Precedence Resolution

1. Seed 20+ reminders with dates spread over 30 days.

2. Reload full-list page.

Expected:
- Default window (7 days) is applied if no preference/override.
- Only reminders with `dueAt <= now + 7 days` are shown (plus overdue).

3. Add query param `?windowDays=14` to full-list URL.

Expected:
- Full-list respects override value.
- Reminders now include dates up to `now + 14 days`.
- Response includes `windowSource: "temporary-override"`.

4. Save user preference for 21-day window; reload full-list without query param.

Expected:
- Saved preference is applied.
- Reminders up to `now + 21 days` shown.
- Response includes `windowSource: "user-preference"`.

## Scenario C: Invalid Window Handling

1. Open full-list with `?windowDays=100` (out of bounds).

Expected:
- System applies 7-day default.
- User sees message: "Invalid window value. Using default 7 days."
- Response includes `windowSource: "default"`.

2. Try `?windowDays=-5`.

Expected:
- Same fallback + explanation.

## Scenario D: Deterministic Ordering

1. Create 3 reminders all due on the same date/time (different types).

Expected:
- Ordering: Vaccination first, then Medication, then Appointment (type order).
- If same type, secondary sort by record ID/name (alphabetical).
- Reloading page produces identical order every time.

## Scenario E: Overdue Inclusion

1. Set one reminder to past due date; don't dismiss.
2. Set window to 1 day (future only).

Expected:
- Overdue undismissed reminder STILL appears in list.
- Marked as "Overdue".
- Sorted after upcoming reminders in due date order.

## Success Criteria Validation

- SC-001 (Full-list completeness): All eligible reminders visible ✓
- SC-002 (Precedence determinism): Window source matches defined order ✓
- SC-003 (Boundary behavior): Inclusive boundary and overdue inclusion confirmed ✓
- SC-004 (Support reduction): Clear error messages for invalid input reduce confusion ✓

## Validation Notes (Implementation Run)

- Automated contract/integration/unit tests executed for full-list endpoint, precedence, determinism, and boundary behavior.
- All implemented tests passed in backend test suite.
- Docker runtime validation remains pending due to local compose startup failure in current environment.
