# Data Model: Milo Care MVP

**Phase**: 1  
**Feature**: [plan.md](plan.md)  
**Research**: [research.md](research.md)  
**Date**: 2026-05-13

---

## Design Decisions

- **Storage**: MongoDB with Mongoose ODM
- **Schema strategy**: Embedded documents (see research.md §4) — dogs embedded in User, health records embedded in Dog
- **Tier enforcement**: `tier` field on User drives free/premium gating (FR-020)
- **Notification scheduling**: Reminder trigger dates stored on health records; a background job queries records with `nextReminderAt <= now` and dispatches emails

---

## Entities & Schemas

### User

Represents a registered dog owner.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Primary key |
| `email` | String | yes | Unique, lowercase, indexed |
| `passwordHash` | String | yes | bcrypt hash — never returned in API responses |
| `name` | String | yes | Display name |
| `tier` | Enum: `free` \| `premium` | yes | Default: `free` |
| `notificationPreferences` | Object | yes | See sub-schema below |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**notificationPreferences sub-schema**:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | Boolean | `true` | Master on/off for all email reminders |
| `vaccinationWindowDays` | Number | `7` | Days before due date to send vaccination reminder |
| `appointmentWindowHours` | Number | `24` | Hours before appointment to send reminder |

**Validation rules**:
- `email`: valid email format, unique across all users
- `password` (input only): minimum 8 characters (never stored; hashed immediately)
- `tier`: must be one of `["free", "premium"]`
- `vaccinationWindowDays`: integer 1–30
- `appointmentWindowHours`: integer 1–168 (1 hour to 7 days)

---

### Dog Profile

Embedded array on User (`user.dogs[]`). Each user may have 1 dog on free tier, unlimited on premium (FR-020).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Sub-document ID |
| `name` | String | yes | Dog's name |
| `breed` | String | yes | Breed description |
| `dateOfBirth` | Date | yes | Used to compute age |
| `photoUrl` | String | no | URL to uploaded photo (optional, FR-003) |
| `createdAt` | Date | auto | |

**Validation rules**:
- `name`: 1–100 characters
- `breed`: 1–100 characters
- `dateOfBirth`: must be in the past; not more than 30 years ago

---

### Vaccination Record

Embedded array on Dog (`user.dogs[i].vaccinations[]`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Sub-document ID |
| `vaccineName` | String | yes | e.g., "Rabies", "Bordetella" |
| `dateAdministered` | Date | yes | Date vaccine was given |
| `nextDueDate` | Date | no | Optional; drives reminder |
| `nextReminderAt` | Date | no | Computed: `nextDueDate - vaccinationWindowDays`; queried by reminder job |
| `veterinarian` | String | no | Administering vet name |
| `notes` | String | no | Free text |
| `createdAt` | Date | auto | |

**State transitions**: No explicit status field. A record is "upcoming" if `nextDueDate > today`; "overdue" if `nextDueDate < today` and no newer record exists for same `vaccineName`.

**Validation rules**:
- `dateAdministered`: must be ≤ today
- `nextDueDate`: must be > `dateAdministered` if provided
- Duplicate detection: warn if same `vaccineName` + `dateAdministered` already exists on this dog (FR-007)

---

### Medication

Embedded array on Dog (`user.dogs[i].medications[]`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Sub-document ID |
| `medicationName` | String | yes | |
| `dosage` | String | yes | e.g., "10mg twice daily" |
| `startDate` | Date | yes | First dose date |
| `endDate` | Date | no | Optional; null = ongoing |
| `frequencyHours` | Number | yes | Hours between doses (e.g., 12 = twice daily) |
| `nextReminderAt` | Date | yes | Next scheduled reminder time; updated by reminder job after each send |
| `status` | Enum: `active` \| `completed` | yes | Default: `active` |
| `notes` | String | no | |
| `createdAt` | Date | auto | |

**State transitions**:
```
active → completed  (user marks as completed, FR-010)
```

**Validation rules**:
- `frequencyHours`: integer 1–168
- `endDate`: must be ≥ `startDate` if provided
- `nextReminderAt` must be in the future when status is `active`

---

### Appointment

Embedded array on Dog (`user.dogs[i].appointments[]`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Sub-document ID |
| `clinicName` | String | yes | |
| `appointmentDate` | Date | yes | Date + time of appointment |
| `reminderAt` | Date | yes | Computed: `appointmentDate - appointmentWindowHours`; queried by reminder job |
| `status` | Enum: `upcoming` \| `completed` \| `cancelled` | yes | Default: `upcoming` |
| `notes` | String | no | |
| `createdAt` | Date | auto | |

**State transitions**:
```
upcoming → completed  (past date auto-transition or user marks done)
upcoming → cancelled  (user cancels, FR-013)
```

**Validation rules**:
- `appointmentDate`: must be in the future at time of creation
- When status transitions to `cancelled`, associated `reminderAt` is cleared (set to null) so the reminder job skips it

---

### Symptom Entry

Embedded array on Dog (`user.dogs[i].symptoms[]`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Sub-document ID |
| `symptomType` | String | yes | Category/label (e.g., "Vomiting", "Lethargy") |
| `description` | String | yes | Free-text description |
| `dateObserved` | Date | yes | Date symptom was noticed |
| `resolved` | Boolean | yes | Default: `false` |
| `createdAt` | Date | auto | |

**Validation rules**:
- `dateObserved`: must be ≤ today
- `description`: 1–2000 characters

---

### Password Reset Token

Standalone collection (not embedded). Ephemeral — purged after use or expiry.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId | yes | Ref to User |
| `tokenHash` | String | yes | bcrypt hash of plaintext token |
| `expiresAt` | Date | yes | 1 hour from creation |
| `usedAt` | Date | no | Set when consumed; null = unused |
| `createdAt` | Date | auto | |

**Indexes**:
- TTL index on `expiresAt` (MongoDB auto-deletes expired tokens)
- Index on `userId` (to enforce rate-limiting: max 3 active tokens per user)

---

## Key Indexes

| Collection / Path | Index Type | Purpose |
|-------------------|------------|---------|
| `users.email` | Unique | Login lookup, duplicate check |
| `users.dogs._id` | Standard | Dog-level queries |
| `users.dogs.vaccinations.nextReminderAt` | Standard | Reminder job query |
| `users.dogs.medications.nextReminderAt` | Standard | Reminder job query |
| `users.dogs.appointments.reminderAt` | Standard | Reminder job query |
| `passwordResetTokens.userId` | Standard | Rate-limit check |
| `passwordResetTokens.expiresAt` | TTL | Auto-purge expired tokens |

---

## Reminder Job

A background scheduled job (runs every 5 minutes) queries for records where:
- `nextReminderAt <= now + 5min` AND `notifications.enabled = true` (user level)

For each match, the job:
1. Dispatches email via `EmailService`
2. Updates `nextReminderAt` to the next scheduled time (medications only; vaccinations/appointments are one-shot)
3. Clears `nextReminderAt` after send for one-shot reminders to prevent duplicate sends

This approach meets SC-008: 90% of reminder notifications delivered within 5 minutes of scheduled time.
