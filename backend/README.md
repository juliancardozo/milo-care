# Backend API Notes

## Dashboard Reminders Full List

### GET /api/dashboard/reminders/full

Returns all eligible reminders for the authenticated user in a single response.

### Query Parameters

- windowDays (optional): integer 1-60. Temporary override for look-ahead window.
- includeOverdue (optional): boolean, default true. Whether overdue reminders are included.

### Response Fields

- reminders: array of reminder items
- total: number of reminders
- windowDays: resolved window value
- windowSource: temporary-override | user-preference | default
- appliedAt: UTC timestamp used for evaluation
- appliedFallback: optional explanation when invalid window fallback is applied

### Deterministic Ordering

Reminders are ordered by:
1. dueAt ascending
2. sourceType priority: vaccination, medication, appointment
3. sourceId/sourceName ascending

## User Preferences

### PATCH /api/user/preferences/reminderWindow

Saves the authenticated user's reminder window preference.

Request body:

{
  "reminderWindowDays": 21
}

Validation: reminderWindowDays must be an integer between 1 and 60.

## Contract Reference

See API contract: specs/003-clarify-fr011-precedence/contracts/full-list-api.yaml
