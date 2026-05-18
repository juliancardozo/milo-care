# Release Notes: Feature 003 - Full Reminders List and Look-Ahead Precedence

## Summary

This release adds a full reminders list flow from the dashboard and clarifies look-ahead precedence rules for deterministic reminder visibility.

## Included Changes

- New endpoint: GET /api/dashboard/reminders/full
- New endpoint: PATCH /api/user/preferences/reminderWindow
- Added deterministic ordering for reminders with identical due timestamps
- Added boundary-inclusive filtering (dueAt <= now + windowDays)
- Added overdue inclusion behavior (when includeOverdue is true)
- Added user-facing fallback messaging for invalid window values
- Added full-list page in frontend: /dashboard/reminders/full
- Added dashboard reminders preview with View all navigation

## Backward Compatibility

- Breaking changes: None
- Migration required: None

## Feature Flags

- reminderFullListEnabled (default true)
- Can be disabled via environment variable REMINDER_FULL_LIST_ENABLED=false

## Known Limitations

- Full list currently returned in a single response (no pagination)

## Validation Summary

- Contract tests: passing
- Integration tests: passing
- Boundary and precedence validations: passing
