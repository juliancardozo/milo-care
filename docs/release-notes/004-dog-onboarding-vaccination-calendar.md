# Release Notes - Feature 004

## Added

- Multi-step dog onboarding flow at `/dogs/new`
- Backend onboarding session APIs with validation and save/resume
- Calendar generation endpoints for vaccine, deworming, and checkup suggestions
- Event status update endpoint for preventive calendar entries
- Reminder aggregation now includes deworming with dedupe safeguards

## Safety and Clinical Boundaries

- Advisory disclaimer included in onboarding and summary UI
- Severe symptom inputs block confirmation unless explicitly allowed for veterinarian review
- Pending-vet-validation statuses are preserved in generated events

## Operational Notes

- Existing dog CRUD and dashboard routes remain compatible
- Reminder full-list keeps overdue behavior and now deduplicates by event key
- Feature uses embedded dogs under user documents for backward compatibility
