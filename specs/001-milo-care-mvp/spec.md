# Feature Specification: Milo Care MVP — Dog Health Management Platform

**Feature Branch**: `001-milo-care-mvp`  
**Created**: 2026-05-13  
**Status**: Clarified  
**Input**: User description: "Milo Care is a SaaS MVP providing dog owners with a centralized platform to manage their dog's health, including vaccination tracking, medication management, veterinary appointment scheduling, and symptom monitoring — designed with an emotionally engaging, modern user experience."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Account Registration & Dog Profile Setup (Priority: P1)

A new dog owner discovers Milo Care, creates an account, and sets up their dog's profile so they can start tracking their pet's health. This is the entry point to all features and must deliver immediate value on first use.

**Why this priority**: No other feature is accessible without a registered account and at least one dog profile. This is the foundation of the entire platform.

**Independent Test**: A new user can sign up, create a dog profile with name, breed, and age, and land on the health dashboard — delivering a fully usable empty state. No other features are required to validate this story.

**Acceptance Scenarios**:

1. **Given** a visitor is on the Milo Care sign-up page, **When** they enter their name, email, and password, **Then** their account is created and they are guided to create their first dog profile.
2. **Given** a new user is creating a dog profile, **When** they enter the dog's name, breed, and date of birth, **Then** the profile is saved and they are taken to the health dashboard for that dog.
3. **Given** a user already has an account, **When** they log in with correct credentials, **Then** they are taken to their dashboard with all their dogs listed.
4. **Given** a user attempts to register with an already-used email, **When** they submit the form, **Then** they see a clear error message explaining the email is already registered.

---

### User Story 2 — Vaccination Tracking & Reminders (Priority: P1)

A dog owner logs their dog's vaccination history and sets a reminder for the next vaccination. They receive a timely notification before the due date so they never miss an important vaccine.

**Why this priority**: Vaccination tracking is the highest-value health feature and the primary reason users adopt the product, according to the target audience research.

**Independent Test**: A user can log a vaccination record, set a reminder date, and verify the reminder appears on their dashboard. This works end-to-end with just this story implemented.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their dog's health dashboard, **When** they select "Add Vaccination" and enter the vaccine name, date administered, and next due date, **Then** the record is saved and displayed in the vaccination history.
2. **Given** a vaccination with a future due date is saved, **When** the due date is within the configured notification window (default: 7 days), **Then** the user receives a reminder notification.
3. **Given** a user has multiple vaccinations logged, **When** they view the vaccination history, **Then** all records are displayed chronologically with dates and vaccine names.
4. **Given** a user attempts to log a vaccination with the same vaccine name and date that already exists, **When** they submit the form, **Then** they are warned about a potential duplicate entry before saving.

---

### User Story 3 — Medication Management & Dosage Reminders (Priority: P2)

A dog owner logs a medication their dog is taking, including the dosage and schedule. They receive reminders at the scheduled times so doses are never missed.

**Why this priority**: Medication adherence is critical to health outcomes and is the second most-requested feature by the target audience, but the app delivers value without it (P1 stories are sufficient for MVP validation).

**Independent Test**: A user can add a medication with a dosage and recurring schedule, and receive reminders at the scheduled times. This is independently testable without the appointment or symptom features.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they select "Add Medication" and enter the medication name, dosage, and schedule (start date, frequency), **Then** the medication is saved and appears in the medication list.
2. **Given** an active medication with a scheduled time, **When** the scheduled time arrives, **Then** the user receives a reminder notification specifying the medication name and dosage.
3. **Given** a dog has completed a course of medication, **When** the user marks it as completed, **Then** it moves to the medication history archive.
4. **Given** a user views the medication list, **When** they select a medication, **Then** they can view and edit its details or mark it as completed.

---

### User Story 4 — Veterinary Appointment Scheduling & Reminders (Priority: P2)

A dog owner schedules an upcoming veterinary appointment and receives a reminder before the appointment date so they can prepare and attend on time.

**Why this priority**: Vet appointment tracking supports the core health management mission. It is independently valuable but less urgently needed than vaccination and medication tracking for MVP validation.

**Independent Test**: A user can log a vet appointment with date, time, and clinic name, and verify a reminder is scheduled. This can be fully tested without the symptom tracker.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they select "Add Appointment" and enter the vet clinic name, date, and time, **Then** the appointment is saved and appears in the upcoming appointments list.
2. **Given** a saved appointment with a future date, **When** the appointment date is within 24 hours, **Then** the user receives a reminder notification.
3. **Given** a user views the appointment list, **When** they look at past dates, **Then** previously scheduled appointments appear in the appointment history.
4. **Given** an appointment needs to be cancelled or rescheduled, **When** the user edits or deletes it, **Then** the change is reflected immediately and any pending reminders are updated.

---

### User Story 5 — Symptom Recording & Monitoring (Priority: P3)

A dog owner records a symptom their dog is displaying, along with the date and a description. They can review the symptom log before a vet visit to provide an accurate account of their dog's health over time.

**Why this priority**: Symptom tracking enhances the health management experience and supports vet communication, but is not required for the core MVP value proposition validated by P1 and P2 stories.

**Independent Test**: A user can add a symptom entry with a date, symptom category, and free-text description, and view their dog's symptom history. This is independently testable.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they select "Log Symptom" and enter the symptom type, description, and date observed, **Then** the entry is saved and displayed in the symptom log.
2. **Given** a user has multiple symptom entries, **When** they view the symptom log, **Then** entries are displayed in reverse-chronological order with dates and descriptions.
3. **Given** a user wants to share symptoms with their vet, **When** they view the symptom log, **Then** the entries are clearly formatted for easy verbal or printed reference.

---

### Edge Cases

- **Offline access**: Users who lose connectivity mid-session should see a clear offline indicator; previously loaded data remains visible but new entries queue for sync on reconnect.
- **Multiple dogs**: Users with more than one dog must be able to switch between dog profiles and all health records must be correctly scoped to the active dog.
- **Missed reminders**: If a user misses a reminder, it should be dismissible and reschedulable from the notification itself or the health dashboard.
- **Missing required fields**: Submission of forms with empty required fields must surface clear, field-level validation errors.
- **Account deletion**: Users who delete their account should have their data purged in line with applicable data protection regulations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow new users to create an account using email and password.
- **FR-002**: System MUST validate that email addresses are unique at registration.
- **FR-003**: System MUST allow users to create one or more dog profiles (name, breed, date of birth, optional photo).
- **FR-004**: System MUST allow users to log vaccination records for each dog (vaccine name, date administered, optional next due date).
- **FR-005**: System MUST send reminder notifications to users when a vaccination due date is approaching (within 7 days by default).
- **FR-006**: System MUST allow users to view vaccination history per dog in chronological order.
- **FR-007**: System MUST warn users of potential duplicate vaccination entries before saving.
- **FR-008**: System MUST allow users to add medications for each dog (name, dosage, start date, frequency/schedule).
- **FR-009**: System MUST send reminder notifications for scheduled medication times.
- **FR-010**: System MUST allow users to mark medications as completed and archive them.
- **FR-011**: System MUST allow users to log veterinary appointments (clinic name, date, time, optional notes).
- **FR-012**: System MUST send reminder notifications for upcoming appointments (at least 24 hours in advance).
- **FR-013**: System MUST allow users to edit or cancel appointments and update associated reminders.
- **FR-014**: System MUST allow users to record symptom entries per dog (symptom type, description, date observed).
- **FR-015**: System MUST display a health dashboard summarizing upcoming reminders and recent activity per dog.
- **FR-016**: System MUST allow users to customize notification preferences (enable/disable, timing windows).
- **FR-017**: System MUST allow users to view complete health history (vaccinations, medications, appointments, symptoms) per dog.
- **FR-018**: System MUST allow users to log in and out of their account securely.
- **FR-019**: System MUST deliver all reminder notifications via email (vaccination due dates, medication times, appointment reminders).
- **FR-020**: Free tier accounts are limited to 1 dog profile; premium accounts allow unlimited dog profiles.
- **FR-021**: System MUST provide an email-based password reset flow using a time-limited, single-use reset link.

### Key Entities

- **User**: A registered dog owner with login credentials and notification preferences.
- **Dog Profile**: A pet record belonging to a user, containing name, breed, date of birth, and optional photo.
- **Vaccination Record**: A health event linked to a dog with vaccine name, date administered, and optional next due date.
- **Medication**: An active or completed medication linked to a dog, with name, dosage, schedule, and status.
- **Appointment**: A scheduled veterinary visit linked to a dog with date, time, clinic, and optional notes.
- **Symptom Entry**: A health observation linked to a dog with symptom type, description, and date observed.
- **Notification**: A scheduled alert linked to a health record that triggers at a configured date/time.

## Success Criteria *(mandatory)*

### Definitions

- **Active User**: Any registered user who has logged in at least once within the last 30 days.

### Measurable Outcomes

- **SC-001**: New users can complete account creation and add their first dog profile in under 3 minutes.
- **SC-002**: Users can log a vaccination record and set a reminder in under 60 seconds.
- **SC-003**: The platform achieves 1,000 active users within 3 months of launch.
- **SC-004**: Active users log at least 3 health activities per week on average.
- **SC-005**: 70% of users who register remain active 6 months after sign-up.
- **SC-006**: The platform achieves a Net Promoter Score (NPS) of 50 or higher within the first 6 months.
- **SC-007**: The platform generates $10,000 in revenue within the first 6 months through subscription fees.
- **SC-008**: 90% of reminder notifications are delivered within 5 minutes of their scheduled time.

## Assumptions

- The MVP targets dog owners exclusively; support for other pet types is deferred to a future phase.
- The initial release is a web-based platform; native mobile apps are deferred to a later phase (v2+).
- A freemium subscription model is assumed: core features are free, with a premium tier unlocking advanced functionality. Free tier is limited to 1 dog profile; premium unlocks unlimited dog profiles and detailed health reports. The specific pricing tiers will be validated with early adopters.
- Veterinarians are secondary users in the MVP — they do not receive dedicated accounts. Dog owners can share health summaries verbally or via printable views.
- Users are assumed to have internet connectivity for core features. Basic offline access (viewing cached data) is a nice-to-have but not required for MVP.
- All reminder notifications are delivered via email. No browser push notifications or SMS in the MVP.
- Data protection compliance (e.g., GDPR for EU users) is required from launch; the exact regulatory scope will be determined prior to go-live. GDPR data portability (Article 20 export) is deferred post-MVP.
- The platform supports a single language (English) at launch; localization is deferred.
