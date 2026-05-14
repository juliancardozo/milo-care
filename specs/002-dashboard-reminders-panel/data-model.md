# Data Model: Dashboard Reminders Panel (AR/UY)

## Scope

This feature extends existing dog health records with a reminder projection and dismissal tracking model.

## Entities

### ReminderProjection (derived, read model)

- Purpose: Unified item shown in dashboard panel.
- Source: Derived from one of:
  - Vaccination (`nextDueDate` / `nextReminderAt`)
  - Medication (`nextReminderAt`)
  - Appointment (`reminderAt` / `appointmentDate`)
- Fields:
  - `id` (string, deterministic): `{sourceType}:{sourceId}:{dueAt}`
  - `sourceType` (enum): `vaccination | medication | appointment`
  - `sourceId` (ObjectId/string)
  - `petId` (ObjectId/string)
  - `petName` (string)
  - `title` (string) - vaccine/medication/appointment label
  - `subtitle` (string, optional) - dosage, clinic, supporting text
  - `dueAt` (datetime)
  - `status` (enum): `upcoming | overdue`
  - `priority` (enum): `low | medium | high`
  - `clickTarget` (string route)
  - `countryProfile` (enum): `AR | UY`
  - `guidanceText` (string) - includes veterinarian recommendation

Validation rules:

- `dueAt` is required.
- `status=overdue` when `dueAt < now` and item not dismissed.
- `clickTarget` must resolve to an existing record detail route.

### ReminderDismissal (persisted)

- Purpose: Track user-dismissed reminders without deleting medical records.
- Fields:
  - `_id`
  - `userId`
  - `reminderKey` (string, unique per user): `{sourceType}:{sourceId}:{dueAt}`
  - `sourceType` (enum): `vaccination | medication | appointment`
  - `sourceId`
  - `petId`
  - `dismissedAt` (datetime)
  - `reason` (enum, optional): `completed | acknowledged | other`

Validation rules:

- (`userId`, `reminderKey`) must be unique.
- Dismissal does not mutate or remove source medical data.

State transitions:

- `visible -> dismissed` on user action.
- Recurring future events produce a new reminder key and become visible again.

### CountryClinicalProfile (configuration)

- Purpose: AR/UY defaults for reminder copy and timing guidance.
- Fields:
  - `countryCode` (enum): `AR | UY`
  - `locale` (string): `es-AR | es-UY`
  - `defaultWindowDays` (integer, default 7)
  - `vaccineGuidance` (text)
  - `consultationGuidance` (text)
  - `medicationGuidance` (text)
  - `mandatoryVetDisclaimer` (text)

Validation rules:

- `mandatoryVetDisclaimer` must be included in rendered reminder guidance.

### RiskProfileFlags (pet-level)

- Purpose: Optional risk modifiers that inform guidance copy (not diagnosis).
- Fields:
  - `petId`
  - `rawDiet` (boolean)
  - `ruralExposure` (boolean)
  - `boardingDaycare` (boolean)
  - `chronicConditions` (array of strings)

Usage:

- Modulates non-prescriptive educational text and suggested follow-up cadence.

## Relationships

- One `User` has many `Pets` (existing).
- One `User` has many `ReminderDismissal` entries.
- One `Pet` can produce many `ReminderProjection` items.
- One `CountryClinicalProfile` applies to many users/pets sharing country.

## Invariants

- Source health records remain the single source of truth.
- Reminder dismissal never deletes clinical events.
- Clinical content is informational and always advises consultation with a trusted veterinarian.
- Antibiotic reminders are based on veterinarian-entered prescription data only.