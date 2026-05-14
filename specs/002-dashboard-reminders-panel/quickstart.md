# Quickstart: Dashboard Reminders Panel with AR/UY Clinical Guidance

## Objective

Validate reminder aggregation, navigation, dismissal, and AR/UY veterinary guidance copy in the dashboard.

## Prerequisites

- Backend running on port 3001
- Frontend running on port 5173
- MongoDB running (Docker or Atlas)
- Seed user with at least one dog profile

## Setup

1. Start stack:

```bash
docker compose up
```

2. Log in to the app.

3. Ensure user profile has country context (`AR` or `UY`).

## Scenario A: Upcoming reminders projection

1. Create one vaccination due in next 5 days.
2. Create one active medication with `nextReminderAt` in next 24 hours.
3. Create one appointment in next 3 days.
4. Open dashboard.

Expected:

- Upcoming reminders panel is visible.
- Items are sorted by due date ascending.
- Each item shows dog name + reminder type.
- If more than 5 items exist, panel truncates and exposes "Ver todo" / "View all".

## Scenario B: Click-through navigation

1. Click a vaccination reminder item.
2. Return to dashboard.
3. Click medication reminder item.
4. Return to dashboard.
5. Click appointment reminder item.

Expected:

- Each click opens its corresponding detail page in <= 2 clicks.

## Scenario C: Dismissal behavior

1. Dismiss one reminder from the panel.
2. Reload dashboard.

Expected:

- Dismissed reminder does not reappear.
- Source clinical record still exists and is unchanged.

## Scenario D: Overdue and empty states

1. Set one reminder to due date in the past.
2. Open dashboard.

Expected:

- Overdue reminder appears with overdue visual state.

3. Remove/complete all reminders in window.

Expected:

- Empty state message appears.
- If no dogs exist, onboarding prompt to create dog profile is shown.

## Scenario E: Clinical guidance and safety language (AR/UY)

1. Set user country profile to AR; reload dashboard.
2. Inspect reminder guidance text.
3. Set user country profile to UY; reload dashboard.
4. Inspect reminder guidance text.

Expected:

- Guidance copy adapts to country profile.
- Guidance remains informational.
- Every clinical guidance block includes recommendation to consult a trusted veterinarian.
- No autonomous antibiotic dosing recommendation is shown.

## Success criteria check

- SC-001: panel renders in <= 2 seconds under normal local load.
- SC-004: click-through in <= 2 clicks.
- SC-005: reminders reflect source updates within <= 1 minute.
