# Quickstart - Feature 004

## Prerequisites

- Backend dependencies installed
- Frontend dependencies installed
- MongoDB available
- Auth token available in frontend local storage

## Run

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login and go to `/dogs/new`
4. Complete onboarding steps
5. Confirm and verify redirect to `/dogs/onboarding/summary`
6. Verify dashboard reminder preview remains visible at `/dashboard`

## Validation Checklist

- Owner disclaimer blocks progress until checked
- Future birth date is blocked
- Severe symptoms show emergency guidance
- Summary shows generated vaccine/deworming/checkup suggestions
- Calendar endpoint `/api/dogs/{dogId}/calendar` returns events
- Reminder full-list endpoint still responds with deduped entries
