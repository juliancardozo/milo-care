# Implementation Plan: Dog Onboarding + Vaccination Calendar (AR/UY)

**Branch**: `004-dog-onboarding-vaccination-calendar` | **Date**: 2026-05-14 | **Spec**: `specs/004-dog-onboarding-vaccination-calendar/spec.md`
**Input**: Feature specification from `/specs/004-dog-onboarding-vaccination-calendar/spec.md`

## Summary

Implement a warm, conversational dog onboarding flow that collects essential health data across 13 screens, automatically generates personalized vaccination and deworming calendars based on local regulations (AR/UY), life stage, and risk profile, and creates automated preventive health reminders. The system serves as an advisory tool only—it never diagnoses or prescribes; all recommendations are conditional on veterinary consultation.

**Scope**: MVP supporting a single dog profile per onboarding session with baseline clinical safety, AR/UY regional compliance, and integration with existing reminder system.

**Timeline**: 3-4 weeks (MVP)

## Technical Context

**Language/Version**: JavaScript (Node.js 20 backend, React 18 frontend)
**Primary Dependencies**: Express 4, Mongoose 8, React Router 6, Redux Toolkit, Axios, Resend, node-cron
**Storage**: MongoDB (local Docker in dev; Atlas-compatible URI)
**Testing**: Jest + Supertest (backend), Vitest + Testing Library (frontend), manual E2E quickstart validation
**Target Platform**: Web app (desktop/mobile browser), timezone-aware for AR/UY users
**Project Type**: Web application (frontend + backend API)
**Performance Goals**: Onboarding form submit <= 3s; calendar generation <= 2s; dashboard reminder load <= 2s
**Constraints**: 
- No autonomous diagnosis/prescription
- All clinical content must include veterinarian consultation disclaimer
- Breed database lookup required for size/weight validation
- Regional rules engine for AR/UY vaccination mandates
- Bilingual support (ES priority, EN secondary)
- Scale/Scope: MVP for up to 1k active users, single-dog onboarding sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Working guardrails applied for this feature:

- **Clinical safety**: Onboarding output is educational and reminder-oriented only; never diagnostic
- **UI messaging**: All calendar output includes "consult your trusted veterinarian" guidance
- **Vaccination logic**: Regional compliance rules (AR/UY mandates) enforced; vet overrides supported
- **Data validation**: Red-flag symptoms block progression; emergency alerts shown
- **Country profile support**: AR/UY must be configurable; regional rules applied at dog model level
- **Vet validation workflow**: Incomplete/high-risk calendars marked "pending_vet_validation"

**Gate status**: **PASS** (all guardrails documented and implementable)

## Project Structure

### Documentation (this feature)

```text
specs/004-dog-onboarding-vaccination-calendar/
├── plan.md              # This file
├── research.md          # Phase 0 output (TBD)
├── data-model.md        # Phase 1 output (TBD)
├── quickstart.md        # Phase 1 output (TBD)
├── contracts/           # Phase 1 output (TBD)
└── tasks.md             # Phase 2+ output (generated separately)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Dog.js                     # Dog profile + lifecycle state
│   │   ├── VaccineEvent.js            # Vaccine record + status tracking
│   │   ├── DewormingEvent.js          # Deworming record + scheduling
│   │   ├── Appointment.js             # Checkup appointments
│   │   ├── OnboardingSession.js       # Transient session during flow
│   │   └── RiskProfile.js             # Computed risk classification
│   ├── services/
│   │   ├── OnboardingService.js       # Multi-step session management
│   │   ├── CalendarEngine.js          # Vaccination/deworming schedule generation
│   │   ├── RiskProfileCalculator.js   # Lifestyle → risk mapping
│   │   ├── VaccineRulesEngine.js      # AR/UY regional rules + age logic
│   │   ├── ValidationService.js       # Field + business logic validation
│   │   ├── RedFlagDetector.js         # Emergency symptom alert system
│   │   └── BreedDatabaseService.js    # Breed lookup + size validation
│   ├── routes/
│   │   ├── onboarding.js              # POST/GET onboarding endpoints
│   │   ├── dogs.js                    # CRUD for dog profiles
│   │   ├── calendar.js                # GET /calendar, event updates
│   │   └── events.js                  # Event status/reschedule endpoints
│   ├── config/
│   │   ├── vaccinationRules.js        # AR/UY vaccine schedules
│   │   └── riskProfiles.js            # Risk classification thresholds
│   └── middleware/
│       ├── validateOnboardingStep.js  # Step-level schema validation
│       └── errorHandler.js            # Centralized error + disclaimer injection

frontend/
├── src/
│   ├── pages/
│   │   ├── DogOnboardingPage.jsx      # Multi-screen form orchestrator
│   │   └── OnboardingSummaryPage.jsx  # Final review + confirm
│   ├── components/
│   │   ├── onboarding/
│   │   │   ├── OwnerProfileForm.jsx
│   │   │   ├── DogBasicInfoForm.jsx
│   │   │   ├── ClinicalHistoryForm.jsx
│   │   │   ├── LifestyleForm.jsx
│   │   │   ├── VaccinationRecordForm.jsx
│   │   │   ├── DewormingHistoryForm.jsx
│   │   │   ├── RedFlagAlert.jsx       # Emergency symptom blocker
│   │   │   ├── StepIndicator.jsx      # Progress tracker
│   │   │   └── DisclosureWarning.jsx  # Clinical disclaimer
│   │   ├── calendar/
│   │   │   ├── VaccinationCalendar.jsx
│   │   │   ├── DewormingCalendar.jsx
│   │   │   ├── EventCard.jsx          # Status badge + action menu
│   │   │   ├── CalendarLegend.jsx     # Status color/icon reference
│   │   │   └── RiskProfileBadge.jsx   # Risk classification display
│   │   └── shared/
│   │       ├── BreedSearchInput.jsx   # Autocomplete breed lookup
│   │       ├── DateRangeValidator.jsx # Birth date conflict detection
│   │       └── EmergencyContactList.jsx # 24h vet locations
│   ├── services/
│   │   ├── onboardingApi.js           # Session + step endpoints
│   │   ├── calendarApi.js             # Calendar + event endpoints
│   │   └── validationRules.js         # Client-side validation schemas
│   ├── store/
│   │   └── onboardingSlice.js         # Redux state for multi-step form
│   └── test/
│       ├── onboarding.integration.test.js
│       ├── calendar.e2e.test.js
│       └── fixtures/
│           ├── mockDogProfiles.js
│           └── mockVaccineSchedules.js
```

---

## Phase 0: Research & Technical Decisions

### Research Output Location
- `specs/004-dog-onboarding-vaccination-calendar/research.md` (generated during Phase 0)

### Key Unknowns to Resolve

1. **Breed Database Integration**
   - Decision: Use embedded breed JSON + fuzzy search (MVP)
   - Rationale: Speed; no external API latency; offline-capable
   - Future: Consider migrating to external breed API (AKC/FCI)

2. **Regional Vaccine Compliance**
   - Decision: Hardcoded AR/UY rules in `config/vaccinationRules.js`
   - Rationale: Fixed regulatory requirements; versionable with release notes
   - Future: Consider rules-as-data (YAML) for non-dev editing

3. **Calendar Generation Strategy**
   - Decision: Generate at onboarding completion; store as VaccineEvent/DewormingEvent records
   - Rationale: Deterministic output; cacheable; editable by vet; supports partial histories
   - Alternative rejected: Dynamic generation per request (too slow; harder to override)

4. **Risk Profile Calculation**
   - Decision: Multi-factor heuristic (lifestyle + environment + diet)
   - Rationale: Captures practical variability; supports educational messaging
   - Limitations: Not ML-based; relies on user honesty; subject to vet override

5. **Incomplete Data Handling**
   - Decision: Mark calendar `pending_vet_validation` if high-risk or missing key data
   - Rationale: Safety-first; ensures human review before reminders auto-trigger
   - UX: Show draft calendar with warning; allow user to continue/save incomplete

6. **Notification Timing**
   - Decision: Schedule reminders using node-cron; send via existing EmailService
   - Rationale: Consistent with reminder system; supports multi-channel (email/SMS/web)
   - Refinement: Timezone-aware scheduling based on user country + city

---

## Phase 1: Design & Architecture

### 1.1 Frontend Screen Layout (13 Screens)

**Onboarding Flow Sequence:**

| Screen # | Title | Purpose | Key Input | Validation |
|----------|-------|---------|-----------|-----------|
| 1 | Welcome & Disclaimer | Set context; get consent | `disclaimerAccepted` | Must accept |
| 2 | Owner Profile | Collect tutore info | name, email, phone, country, city | Email unique; country → AR/UY |
| 3 | Basic Dog Info | Name, DOB, breed | name, birthDate/estimatedAge, breed, size, sex | Name 1-50 chars; breed lookup |
| 4 | Clinical History (Pt 1) | Vaccines, allergies, conditions | hasVeterinarian, allergies, conditions, medications | Check allergy duplicates |
| 5 | Clinical History (Pt 2) | Previous reactions, symptoms | previousVaccineReactions, recentSymptoms | **RED FLAG DETECTION** |
| 6 | Lifestyle & Risk | Daily activities, exposure | livesIndoors, dogParkAttendance, ruralExposure, rawDiet, etc. | Risk profile calc |
| 7 | Existing Vaccines | Import prior records | vaccinationRecords[] with dates/photos | Date validation; lot number optional |
| 8 | Deworming History | Import prior deworming | dewormingHistory[] with dates | Date validation |
| 9 | Summary Review | Display collected data | All fields read-only | Show missing sections |
| 10 | Generated Calendar (Draft) | Preview suggested events | VaccineEvents + DewormingEvents + Appointments | Show statuses; highlight pending_vet_validation |
| 11 | Missing Data Alert | List incomplete fields | Unresolved fields | User can ignore or backfill |
| 12 | Confirm & Save | Final confirmation | Checkbox "confirm" | Must accept disclaimer again |
| 13 | Success & Next Steps | Celebrate; offer next actions | Summary + CTA | Dashboard link; upload doc link |

**Conditional Screens:**
- **Red Flag Alert** (replaces next button if severe symptoms detected)
- **Catch-up Vaccine Plan** (if adult with no vaccination history)
- **Vet Finder** (if user indicates no veterinarian)

### 1.2 Component Breakdown

**Frontend Components:**

```
├── DogOnboardingPage (page orchestrator)
│   ├── StepIndicator (progress: 1/13 → 13/13)
│   ├── StepContainer
│   │   ├── OwnerProfileForm
│   │   │   ├── TextInput (name)
│   │   │   ├── EmailInput (email)
│   │   │   ├── PhoneInput (phone)
│   │   │   ├── CountrySelect (AR/UY)
│   │   │   ├── CityAutocomplete
│   │   │   └── DisclaimerCheckbox
│   │   ├── DogBasicInfoForm
│   │   │   ├── TextInput (name)
│   │   │   ├── BirthDateInput (toggle: exact/estimated)
│   │   │   ├── DateRangeValidator (DOB ↔ age conflict detection)
│   │   │   ├── BreedSearchInput (fuzzy search + autocomplete)
│   │   │   ├── SizePredictor (breed → size suggestion)
│   │   │   ├── SexSelect
│   │   │   ├── WeightInput (with unit toggle kg/lbs)
│   │   │   └── NeuteredSelect
│   │   ├── ClinicalHistoryForm (split into Pt 1 & Pt 2)
│   │   │   ├── VeterinarianLookup
│   │   │   ├── AllergiesMultiInput
│   │   │   ├── ConditionsMultiInput
│   │   │   ├── MedicationList
│   │   │   │   └── MedicationItem (name, ingredient, dose, dates)
│   │   │   ├── VaccineReactionSelect
│   │   │   ├── SymptomChecklist
│   │   │   │   ├── CheckboxGroup (vomiting, diarrhea, cough, etc.)
│   │   │   │   └── RedFlagDetector (triggers alert if present)
│   │   │   └── EmergencyAlertOverlay (blocks next; shows contacts)
│   │   ├── LifestyleForm
│   │   │   ├── CheckboxGroup (lives indoors, walks daily, etc.)
│   │   │   ├── RiskCalculator (evaluates profile)
│   │   │   └── RiskProfileBadge (displays: Low/Medium/High)
│   │   ├── VaccinationRecordForm
│   │   │   ├── VaccineRecordList
│   │   │   │   └── VaccineRecord (type, date, lot, photo upload)
│   │   │   └── PhotoUploadZone (drag/drop libreta sanitaria)
│   │   ├── DewormingHistoryForm
│   │   │   ├── DewormingRecordList
│   │   │   │   └── DewormingRecord (product, date, vet name)
│   │   │   └── LastCheckInput
│   │   ├── SummaryReview
│   │   │   ├── Section (owner, dog, clinical, lifestyle, vaccines, deworming)
│   │   │   ├── EditButton (back to step)
│   │   │   └── MissingDataWarning (list incomplete fields)
│   │   ├── CalendarDraft
│   │   │   ├── VaccinationCalendar (grid view; status badges)
│   │   │   ├── DewormingCalendar (grid view; status badges)
│   │   │   ├── AppointmentList (suggested checkups)
│   │   │   ├── CalendarLegend (status colors: sugerido/pending_vet/completado/vencido)
│   │   │   ├── PendingVetValidationWarning (if applicable)
│   │   │   └── EditEventModal (reschedule/change status)
│   │   ├── MissingDataScreen
│   │   │   ├── MissingFieldsList
│   │   │   ├── SkipButton (continue anyway)
│   │   │   └── BackfillLinks (add now or later)
│   │   ├── ConfirmScreen
│   │   │   ├── FinalSummary
│   │   │   ├── DisclaimerCheckbox (confirm again)
│   │   │   └── SaveButton
│   │   └── SuccessScreen
│   │       ├── SuccessMessage
│   │       ├── OnboardingSummaryCard (formatted summary)
│   │       ├── PhotoUploadCTA (libreta sanitaria)
│   │       └── DashboardLink (go to reminders)
│   ├── Navigation
│   │   ├── BackButton (skip steps)
│   │   ├── NextButton (with validation)
│   │   └── SaveDraftButton (auto-save)
│   └── DisclosureWarning (fixed footer on all screens)

OnboardingSummaryPage (final review)
└── Summary view for printing/sharing
```

**Backend Services:**

```
├── OnboardingService
│   ├── startSession(userId) → sessionId
│   ├── saveStep(sessionId, stepKey, data) → validation result
│   ├── getSession(sessionId) → draft state
│   ├── confirmSession(sessionId) → creates Dog + Events; returns summary
│   └── cancelSession(sessionId)
├── CalendarEngine
│   ├── generateVaccineSchedule(dog, existingRecords, riskProfile) → VaccineEvent[]
│   ├── generateDewormingSchedule(dog, existingRecords, riskProfile) → DewormingEvent[]
│   ├── generateCheckupSchedule(dog, riskProfile) → Appointment[]
│   └── reconcileWithExisting(planned[], existing[]) → merged[]
├── RiskProfileCalculator
│   ├── calculate(lifestyle) → { level: "low|medium|high", factors: [], score }
│   └── updateRecommendations(riskProfile) → vaccination priorities
├── VaccineRulesEngine
│   ├── getSchedule(country, ageGroup, riskProfile) → schedule rules
│   ├── getNextDue(vaccineType, lastAdminDate, country) → ISO date
│   ├── validateMandates(country, vaccinationType) → { isMandatory, explanation }
│   └── getTravelRestrictions(fromCountry, toCountry) → { requiresRabies, expiryWindow }
├── ValidationService
│   ├── validateEmail(email) → { valid, reason }
│   ├── validateBreed(breed) → { valid, suggestedSize, weight range }
│   ├── validateBirthDate(birthDate, estimatedAge) → { valid, conflict, suggestion }
│   ├── validateWeight(weight, breed, age) → { valid, warning }
│   └── validateAge(birthDate) → { ageInMonths, lifeStage }
├── RedFlagDetector
│   ├── detectSevereSymptoms(symptoms) → { hasSevere, symptomsList, action }
│   ├── shouldBlockOnboarding(dog, clinicalHistory) → boolean
│   └── generateEmergencyAlert() → alert message + contacts
├── BreedDatabaseService
│   ├── searchBreed(query) → { id, name, size, weight range, group }
│   ├── getBreedSize(breedId) → "small|medium|large|giant"
│   ├── fuzzyMatch(query) → suggestions[]
│   └── validateBreedWeight(breedId, weight) → { valid, warning }
└── ReminderScheduler
    ├── scheduleReminders(dog, events) → reminders created
    ├── calculateReminderTimes(eventDate, riskProfile) → [-30d, -14d, -7d, -1d]
    └── rescheduleOnPostponement(eventId, newDate) → reminders adjusted
```

### 1.3 Backend Service Architecture

**Onboarding Session Lifecycle:**

```
User opens onboarding
    ↓
POST /api/onboarding/start
    ├─ Create OnboardingSession (transient, expires 30 min)
    └─ Return sessionId + step 0 (disclaimer)

User fills Step N (e.g., owner profile)
    ↓
POST /api/onboarding/{sessionId}/owner
    ├─ Validate step schema (Joi)
    ├─ Save to session.steps[N] in MongoDB
    ├─ Check for blocking errors (e.g., red flags)
    └─ Return { valid: true, canProceed: true/false, warnings: [] }

User reaches Step 9 (Summary)
    ↓
GET /api/onboarding/{sessionId}/summary
    ├─ Read all session.steps
    ├─ Calculate risk profile
    ├─ Generate draft calendar (not persisted yet)
    └─ Return { dog data, warnings, draft events }

User confirms Step 12 (Save)
    ↓
POST /api/onboarding/{sessionId}/confirm
    ├─ Create User (if new)
    ├─ Create Dog (with lifeStage, riskProfile)
    ├─ Create VaccineEvent[] (from generated schedule)
    ├─ Create DewormingEvent[] (from generated schedule)
    ├─ Create Appointment[] (suggested checkups)
    ├─ Schedule Reminder[] (via ReminderScheduler)
    ├─ Delete OnboardingSession (cleanup)
    ├─ Emit event 'DogOnboardingCompleted' (for analytics)
    └─ Return { dogId, summary, calendarUrl }

User views calendar
    ↓
GET /api/dogs/{dogId}/calendar
    ├─ Fetch VaccineEvent[] + DewormingEvent[] + Appointment[]
    ├─ Organize by month + status
    └─ Return { events[], missingData[], riskProfile, nextActions }
```

### 1.4 Database Schema (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                     USERS (existing)                            │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID)                                                       │
│ name, email*, phone, country* (AR|UY), city*, timezone         │
│ notificationChannel (email|sms|web), disclaimerAccepted*       │
│ createdAt, updatedAt                                           │
└──────────────┬──────────────────────────────────────────────────┘
               │ 1:N
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                        DOGS (new)                               │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID), userId* (FK)                                         │
│ name*, breed*, size (small|medium|large|giant)                 │
│ birthDate (nullable), birthDateConfidence (exact|est|unknown)  │
│ sex (male|female|unknown), neutered (yes|no|unknown)           │
│ weightKg*, microchipId                                          │
│ lifeStage (neonatal|early_puppy|late_puppy|young_adult|...)*  │
│ riskProfile (low|medium|high)*, countryProfile (AR|UY)*       │
│ allergies[], conditions[], hasVeterinarian, veterinarianName  │
│ onboardingCompleted*, onboardingCompletedAt                   │
│ createdAt, updatedAt                                           │
└──────┬───────────┬───────────────────────────────────┬──────────┘
       │ 1:N       │                                   │ 1:N
       │           │                                   │
  ┌────▼───┐  ┌────▼────────────┐          ┌─────────▼─────────────┐
  │VACCINES │  │ DEWORMING       │          │ APPOINTMENTS          │
  ├────────┤  ├─────────────────┤          ├──────────────────────┤
  │ id, dogId*│ id, dogId*      │          │ id, dogId*           │
  │vaccineType│ productName     │          │ type (consult,check) │
  │antigens[] │ parasiteType    │          │ scheduledAt, vetName │
  │admin At  │ adminAt         │          │ status, notes        │
  │nextDueAt*│ nextDueAt       │          │ clinicName, reason   │
  │status*   │ status*         │          │ createdAt, updatedAt │
  │(sugerido,│ (sugerido,      │          └──────────────────────┘
  │ pending, │  pending,       │
  │ vencido) │  vencido)       │          ┌──────────────────────┐
  │requiresV │ requiresVet     │          │ REMINDERS (existing) │
  │ etVali   │Validation       │          ├──────────────────────┤
  │dation*   │ source          │          │ id, userId*, dogId*  │
  │source    │ createdAt,      │          │ relatedEntityType*   │
  │createdAt │ updatedAt       │          │ relatedEntityId*     │
  │          │                 │          │ scheduledFor*, channel
  └──────────┘ └─────────────────┘          │ sentAt, status       │
                                           │ createdAt, updatedAt │
                                           └──────────────────────┘
```

**Key Relationships:**

```
User (1) ──→ (N) Dogs
Dog (1) ──→ (N) VaccineEvents
Dog (1) ──→ (N) DewormingEvents
Dog (1) ──→ (N) Appointments
Dog (1) ──→ (N) Reminders
```

### 1.5 API Contracts

**Onboarding Flow Endpoints:**

```yaml
POST /api/onboarding/start
  Response:
    {
      sessionId: "sess-123",
      stepIndex: 0,
      stepKey: "disclaimer",
      expiresAt: "2026-05-14T10:30:00Z"
    }

POST /api/onboarding/{sessionId}/owner
  Body:
    {
      name: "María García",
      email: "maria@example.com",
      phone: "+54 911 2345-6789",
      country: "AR",
      city: "Buenos Aires",
      disclaimerAccepted: true
    }
  Response:
    {
      valid: true,
      warnings: [],
      nextStep: { index: 1, key: "dog-basic" }
    }

POST /api/onboarding/{sessionId}/dog-basic
  Body:
    {
      name: "Milo",
      birthDate: "2026-01-14",
      birthDateConfidence: "exact",
      breed: "Labrador Retriever",
      size: "large",
      sex: "male",
      neutered: false,
      weightKg: 15,
      microchipId: null
    }
  Response:
    {
      valid: true,
      warnings: [],
      suggestedSize: "large",
      calculatedLifeStage: "early_puppy",
      nextStep: { index: 2, key: "clinical-history" }
    }

POST /api/onboarding/{sessionId}/clinical-history-pt1
  Body:
    {
      hasVeterinarian: true,
      veterinarianName: "Dr. López",
      allergies: ["penicilina"],
      conditions: [],
      currentMedications: []
    }
  Response:
    {
      valid: true,
      warnings: [],
      nextStep: { index: 3, key: "clinical-history-pt2" }
    }

POST /api/onboarding/{sessionId}/clinical-history-pt2
  Body:
    {
      previousVaccineReactions: "none",
      recentSymptoms: {
        hasVomiting: false,
        hasDiarrhea: false,
        hasCough: false,
        hasSeizures: false,
        hasDermatitis: false,
        hasLimping: false,
        hasAppetiteLoss: false,
        otherSymptoms: null
      }
    }
  Response:
    {
      valid: true,
      warnings: [],
      redFlagsDetected: false,
      nextStep: { index: 4, key: "lifestyle" }
    }

POST /api/onboarding/{sessionId}/lifestyle
  Body:
    {
      livesIndoors: false,
      dailyWalks: true,
      dogParkAttendance: true,
      cohabitsWithDogs: false,
      daycare: false,
      groomer: false,
      travelsBetweenCountries: false,
      ruralOrVisitsRural: false,
      standsWater: false,
      rawDiet: false,
      contactWithRodents: false
    }
  Response:
    {
      valid: true,
      warnings: [],
      riskProfile: { level: "medium", factors: ["daily_walks", "dog_park"], score: 6 },
      nextStep: { index: 5, key: "vaccines" }
    }

GET /api/onboarding/{sessionId}/summary
  Response:
    {
      owner: { name, email, country, city },
      dog: { name, breed, age, sex, weight, riskProfile },
      clinicalHistory: { allergies, conditions, veterinarian },
      lifestyle: { riskProfile, factors },
      existingVaccines: [ vaccine records ],
      existingDeworming: [ deworming records ],
      missingData: ["veterinarian", "vaccination_photo"]
    }

POST /api/onboarding/{sessionId}/confirm
  Body:
    {
      disclaimerConfirmed: true,
      allowPendingVetValidation: false
    }
  Response:
    {
      success: true,
      dog: {
        id: "dog-123",
        name: "Milo",
        onboardingCompletedAt: "2026-05-14T10:45:00Z"
      },
      calendar: {
        vaccineEvents: [ events with status ],
        dewormingEvents: [ events with status ],
        appointments: [ checkup suggestions ],
        pendingVetValidation: false
      },
      remindersScheduled: 12,
      nextSteps: ["complete_vet_consultation", "upload_libreta_sanitaria"]
    }

GET /api/dogs/{dogId}/calendar
  Query: ?month=2026-05&status=sugerido|completado
  Response:
    {
      dog: { name, breed, riskProfile, lifeStage },
      events: [
        {
          id: "vax-123",
          type: "vaccine",
          vaccineType: "Triple",
          scheduledFor: "2026-03-18",
          status: "sugerido",
          nextDueAt: "2026-03-18",
          actions: { reschedule, complete, skip }
        },
        ...
      ],
      missingData: [],
      disclaimer: "Esta información es orientativa..."
    }

PATCH /api/events/{eventId}/status
  Body:
    {
      status: "completado",
      completedAt: "2026-05-14",
      vetName: "Dr. López",
      lotNumber: "ABC-123" (optional)
    }
  Response:
    {
      success: true,
      event: { ... updated state ... },
      remindersAdjusted: 0,
      nextAction: { type: "vaccine", name: "Rabies booster", dueAt: "2026-06-14" }
    }
```

---

## Phase 2: Implementation Phases (16-22 days total)

### Phase 2A: Data Model + API Foundation (Days 1-4)

**Objective**: Set up MongoDB schemas, core validation, backend routes, and onboarding session management.

**What Gets Built:**
- Dog, VaccineEvent, DewormingEvent, Appointment models
- OnboardingSession transient model
- BreedDatabase (embedded JSON)
- ValidationService with field + business logic validators
- OnboardingService core session management
- Initial API endpoints (start, save-steps, confirm)

**Key Files:**
```
backend/src/
├── models/
│   ├── Dog.js (schema + methods: getLifeStage, getRiskProfile)
│   ├── VaccineEvent.js (schema + status management)
│   ├── DewormingEvent.js
│   ├── Appointment.js
│   └── OnboardingSession.js (transient, 30-min TTL)
├── services/
│   ├── ValidationService.js (validateEmail, validateBreed, validateBirthDate)
│   ├── BreedDatabaseService.js (searchBreed, getBreedSize, fuzzyMatch)
│   ├── OnboardingService.js (startSession, saveStep, getSession, confirmSession)
│   └── RedFlagDetector.js (detectSevereSymptoms)
├── config/
│   ├── breeds.json (embedded breed database: 200+ breeds)
│   └── vaccinationRules.js (AR/UY vaccine schedules by age)
└── routes/
    └── onboarding.js (POST /start, /save-step, /confirm; GET /summary, /draft)
```

**API Endpoints Involved:**
- `POST /api/onboarding/start`
- `POST /api/onboarding/{sessionId}/owner`
- `POST /api/onboarding/{sessionId}/dog-basic`
- `GET /api/onboarding/{sessionId}/draft`

**Testing Strategy:**
- Unit: ValidationService (50+ test cases: valid emails, conflicting ages, breed lookups)
- Unit: RedFlagDetector (symptom combinations)
- Integration: Session lifecycle (create → save steps → retrieve → expire)
- Contract: Schema validation against posted bodies

**Dependencies on Other Phases:**
- None (foundational)

**Risk Mitigation:**
- Risk: Breed database incomplete → Mitigation: Start with 100 common breeds; allow custom entry + vet override
- Risk: ValidationService too strict → Mitigation: Show warnings, not errors; allow user to proceed with caution
- Risk: Session expiry → Mitigation: Auto-save to session; warn before expiry

**Success Criteria:**
- All 3 validation routes respond in < 200ms
- Session persists correctly across requests
- Schema violations caught with helpful error messages

---

### Phase 2B: Onboarding UI + Form Logic (Days 5-9)

**Objective**: Build React components for 13-screen flow; implement Redux state; handle client-side validation and navigation.

**What Gets Built:**
- DogOnboardingPage orchestrator component
- All 13 step forms (OwnerProfileForm, DogBasicInfoForm, etc.)
- StepIndicator progress tracker
- Navigation (Back/Next/SaveDraft)
- RedFlagAlert overlay + emergency contact list
- Client-side form validation (Zod/Yup schemas)
- Redux slice for multi-step form state

**Key Files:**
```
frontend/src/
├── pages/
│   ├── DogOnboardingPage.jsx (main orchestrator)
│   └── OnboardingSummaryPage.jsx (final review)
├── components/onboarding/
│   ├── StepIndicator.jsx
│   ├── OwnerProfileForm.jsx
│   ├── DogBasicInfoForm.jsx
│   ├── ClinicalHistoryForm.jsx (split into Pt 1 & 2)
│   ├── LifestyleForm.jsx
│   ├── VaccinationRecordForm.jsx
│   ├── DewormingHistoryForm.jsx
│   ├── SummaryReview.jsx
│   ├── CalendarDraft.jsx
│   ├── ConfirmScreen.jsx
│   ├── SuccessScreen.jsx
│   ├── RedFlagAlert.jsx
│   ├── EmergencyContactList.jsx
│   └── DisclosureWarning.jsx
├── components/shared/
│   ├── BreedSearchInput.jsx (autocomplete)
│   ├── DateRangeValidator.jsx (DOB ↔ age conflict)
│   └── RiskProfileBadge.jsx
├── store/
│   ├── onboardingSlice.js (Redux: steps[], currentStep, validationErrors)
│   └── hooks.js (useOnboarding, useCurrentStep)
└── services/
    └── validationRules.js (Zod schemas for each step)
```

**API Endpoints Involved:**
- POST endpoints for each step
- GET /api/onboarding/{sessionId}/summary
- GET /api/onboarding/{sessionId}/draft

**Testing Strategy:**
- Unit: validationRules.js (form schemas; test 20+ error conditions)
- Component: BreedSearchInput (search, debouncing, no results)
- Component: RedFlagAlert (display logic; dismissal blocked until "consulted vet" checked)
- Integration: Form flow (fill → next → validation → back → edit)

**Dependencies on Other Phases:**
- Phase 2A (API routes ready)

**Risk Mitigation:**
- Risk: Form state loss on browser refresh → Mitigation: Auto-save every 10s; retrieve from draft on re-enter
- Risk: User abandons mid-onboarding → Mitigation: Show "resume" CTA on login if incomplete session
- Risk: Breed autocomplete slow → Mitigation: Pre-load common breeds; client-side fuzzy search

**Success Criteria:**
- All form inputs validate client-side
- Navigation works correctly (no skipped steps)
- Redux state syncs with backend session
- Responsive on mobile (375px width)

---

### Phase 2C: Calendar Engine + Rules (Days 10-14)

**Objective**: Implement vaccine/deworming schedule generation; apply AR/UY regional rules; handle incomplete histories.

**What Gets Built:**
- CalendarEngine (multi-schedule generation)
- VaccineRulesEngine (AR/UY mandate logic)
- RiskProfileCalculator
- Event reconciliation (existing + suggested)
- Calendar state transitions (sugerido → pending_vet_validation → completado)
- Vet override mechanism

**Key Files:**
```
backend/src/
├── services/
│   ├── CalendarEngine.js
│   │   ├── generateVaccineSchedule(dog, existing, riskProfile)
│   │   ├── generateDewormingSchedule(dog, existing, riskProfile)
│   │   ├── generateCheckupSchedule(dog, riskProfile)
│   │   └── reconcileWithExisting(planned, existing)
│   ├── VaccineRulesEngine.js
│   │   ├── getSchedule(country, ageGroup, riskProfile)
│   │   ├── getNextDue(vaccineType, lastAdminDate, country)
│   │   ├── getTravelRestrictions(fromCountry, toCountry)
│   │   └── validateMandates(country, type)
│   ├── RiskProfileCalculator.js
│   │   ├── calculate(lifestyle) → { level, factors, score }
│   │   └── updateRecommendations(riskProfile)
│   └── ValidationService.js (additions for cross-field validation)
└── config/
    └── vaccinationRules.js (AR/UY schedules; see spec section 5)
```

**API Endpoints Involved:**
- POST /api/onboarding/{sessionId}/confirm (triggers calendar generation)
- GET /api/dogs/{dogId}/calendar
- GET /api/dogs/{dogId}/vaccines
- GET /api/dogs/{dogId}/deworming

**Testing Strategy:**
- Unit: CalendarEngine (50+ scenarios: puppy with history, adult no history, senior, etc.)
- Unit: VaccineRulesEngine (AR rabies mandate, UY variations, travel rules)
- Unit: RiskProfileCalculator (lifestyle combinations)
- Integration: Full pipeline (onboarding → calendar generation → event creation)
- Determinism test: Same input → same output (reproducible schedules)

**Dependencies on Other Phases:**
- Phase 2A (models)

**Risk Mitigation:**
- Risk: Incorrect vaccine schedule for age → Mitigation: Validate against veterinary best practices; include disclaimer; allow vet override
- Risk: Over-generating reminders → Mitigation: Use "pending_vet_validation" status; block auto-reminders until vet approves
- Risk: Edge cases (unknown age, adopted, etc.) → Mitigation: Comprehensive edge-case testing; default to "requires vet review"

**Success Criteria:**
- Calendar generation < 2s for complex profiles (5 prior vaccines, multiple conditions)
- AR/UY mandate compliance verified by domain expert review
- Edge cases (unknown age, adopted) handled gracefully
- All events carry appropriate status flag

---

### Phase 2D: Reminders + Notifications (Days 15-17)

**Objective**: Schedule reminders using node-cron; integrate with EmailService; set timezone-aware timing.

**What Gets Built:**
- ReminderScheduler service
- Cron job trigger for daily reminder batch
- Email template generation (reminder copy + clinical disclaimer)
- Notification deduplication (prevent duplicate reminders for same event)
- Reminder reschedule logic (when event delayed)
- Notification channel routing (email/SMS/web)

**Key Files:**
```
backend/src/
├── services/
│   ├── ReminderScheduler.js
│   │   ├── scheduleReminders(dog, events)
│   │   ├── calculateReminderTimes(eventDate, riskProfile)
│   │   ├── rescheduleOnPostponement(eventId, newDate)
│   │   └── sendDueReminders() (cron-triggered)
│   └── ReminderNotificationService.js (email template generation)
├── jobs/
│   ├── sendRemindersJob.js (node-cron daily trigger)
│   └── cleanExpiredSessions.js (cleanup onboarding sessions)
└── config/
    └── reminderTemplates.js (email/SMS text by reminder type)
```

**API Endpoints Involved:**
- PATCH /api/events/{eventId}/reschedule (triggers ReminderScheduler.rescheduleOnPostponement)
- POST /api/reminders/{reminderId}/dismiss (mark dismissed)
- GET /api/reminders (list pending for user)

**Testing Strategy:**
- Unit: calculateReminderTimes (various risk profiles; timezone handling)
- Integration: Full reminder workflow (event created → reminders scheduled → cron fires → email sent)
- E2E: Create event → verify reminder scheduled → advance time → verify email sent
- Load test: Send 1000 reminders in batch (target: < 30s)

**Dependencies on Other Phases:**
- Phase 2A (models)
- Phase 2C (events created)
- Existing EmailService + node-cron setup

**Risk Mitigation:**
- Risk: Duplicate reminders sent → Mitigation: Deduplication key (dogId + eventId + eventDate); check before insert
- Risk: Timezone confusion → Mitigation: Store user.timezone; calculate reminder times in user's TZ; verify on send
- Risk: Missed reminders if server down → Mitigation: Store scheduled reminders in DB; retry on restart

**Success Criteria:**
- Reminders scheduled within 1s of event creation
- Email sent within 1h of scheduled time
- No duplicate reminders within 24h
- Timezone-aware scheduling verified for AR/UY regions

---

### Phase 2E: Polish + Testing (Days 18-22)

**Objective**: End-to-end testing, edge case handling, UX polish, documentation, and MVP launch preparation.

**What Gets Built:**
- E2E test suite (happy path + edge cases)
- Manual QA testing checklist
- Accessibility audit (WCAG A)
- Performance optimization (code splitting, lazy load)
- Documentation (API docs, deployment guide)
- Release notes + migration guide
- Feature flag setup for gradual rollout (AR/UY)

**Key Files:**
```
backend/tests/
├── e2e/
│   ├── onboarding.flow.test.js (13-screen happy path)
│   ├── calendar.generation.test.js (schedule accuracy)
│   └── edge.cases.test.js (adopted dogs, unknown age, etc.)
└── fixtures/
    ├── mockDogs.js (50+ profiles for testing)
    └── mockVaccineSchedules.js (expected outputs)

frontend/tests/
├── e2e/
│   ├── onboarding.integration.test.js (Playwright/Cypress)
│   └── calendar.interaction.test.js
└── accessibility/
    └── a11y.test.js (axe-core)

docs/
├── API.md (OpenAPI/Swagger spec)
├── DEPLOYMENT.md (feature flag rollout)
├── MIGRATION.md (database changes from Phase 2A)
└── TESTING.md (manual QA checklist)
```

**API Endpoints Involved:**
- All endpoints tested end-to-end

**Testing Strategy:**
- E2E: 5 complete user journeys (puppy, adult, senior, adopted, catch-up)
- Edge cases: 20 scenarios (unknown age, no vet, red flags, conflicting dates)
- Performance: Onboarding flow < 3s per step; calendar load < 2s
- Accessibility: WCAG A compliance; screen reader testing

**Dependencies on Other Phases:**
- All prior phases complete

**Risk Mitigation:**
- Risk: Launch with bugs → Mitigation: Comprehensive E2E testing + manual QA checklist
- Risk: Poor mobile UX → Mitigation: Responsive testing on 5+ device sizes
- Risk: Data migration issues → Mitigation: Dry-run on production-like data volume

**Success Criteria:**
- 95% test coverage for CalendarEngine, VaccineRulesEngine, ValidationService
- All E2E scenarios pass
- Lighthouse performance > 85
- WCAG A compliance pass
- Zero known critical bugs

---

## Phase 3: Testing Strategy

### Unit Tests

**CalendarEngine (40 test cases):**
- Puppy: 6-16 weeks with no history → generates full series
- Puppy: 6-16 weeks with partial history → catch-up schedule
- Adult: 1-7 years, no history → generates single booster + rabies
- Adult: 1-7 years, up-to-date → next due in 1 year
- Senior: > 7 years → semi-annual checkups
- Unknown age → defaults to "pending vet validation"
- Raw diet + rural → increased parasite frequency
- Catch-up scenarios: Dates in future (invalid), dates > dog's age (invalid)

**VaccineRulesEngine (30 test cases):**
- AR rabies mandatory from 3 months → correct schedule
- UY rabies mandatory from 3 months → correct schedule
- Leptospira recommended for rural + standing water → suggested
- Leptospira not recommended for indoor-only → not suggested
- Bordetella recommended for daycare → suggested
- Travel AR → UY: rabies certificate validity window
- Booster timing: Correct interval between doses

**ValidationService (50+ test cases):**
- Email: Valid, invalid, duplicate
- Breed: Valid breed → size suggestion; invalid breed → search alternatives
- Birth date: exact vs estimated conflict detection
- Age: Correctly maps to life stage
- Weight: Validation against breed range with warning

**RedFlagDetector (15 test cases):**
- No symptoms → no alert
- Vomiting + diarrhea (mild) → warning
- Seizures → emergency alert; block progression
- Respiratory distress → emergency alert; show contacts
- Multiple flags → aggregate alert

### Integration Tests

**Onboarding Session Lifecycle:**
- Start session → save owner → save dog → save clinical → save lifestyle → confirm → verify events created
- Mid-flow: abandon session → new session → different data
- Time-based: session expires after 30 min; can't resume

**Calendar Generation:**
- Complete onboarding → calendar generated with correct statuses
- Partial vaccine history → reconcile with suggested schedule
- Red flag detected → calendar marked pending_vet_validation

**Reminder Scheduling:**
- Event created → reminders scheduled at -30d, -14d, -7d, -1d (for appropriate risk levels)
- Event rescheduled → reminders adjusted
- Event completed → reminders stopped

### E2E Tests (Playwright/Cypress)

**Happy Path (Puppy):**
1. Click "Agregar perro"
2. Fill owner profile
3. Fill dog basic (4-month Labrador)
4. Fill clinical history (no allergies, no symptoms)
5. Fill lifestyle (dog park, daily walks, medium risk)
6. Import vaccine record (photo upload)
7. Import deworming history
8. Review summary
9. Confirm & save
10. Verify calendar shows correct events
11. Verify dashboard displays reminders

**Edge Case (Adopted Adult, No History):**
1. Onboarding flow for 3-year-old, unknown age confidence
2. No prior vaccines → system suggests catch-up plan
3. Calendar marked "pending_vet_validation"
4. Red flag detected (limp) → alert shown
5. User bypasses alert with "consulted vet"
6. Confirm & save
7. Verify calendar shows pending events

**Mobile Responsiveness:**
- Onboarding on 375px width viewport
- Form inputs accessible without zoom
- Navigation visible and clickable

### Manual QA Checklist

```
[ ] Disclaimer visible on every screen; must accept to proceed
[ ] Step back button works; data persists
[ ] Breed search: "Lab", "Labrador", "Labrador Retriever" all work
[ ] Birth date conflict detection: "born 1/1/2024" + "6 months old" → shows warning
[ ] Red flag alert: Select "convulsiones" → alert shows; can't proceed without vet confirmation
[ ] Risk profile calculated correctly: 7 factors selected → "Medio" risk
[ ] Calendar draft shows correct statuses: "sugerido" with gray badge, "pending_vet_validation" with yellow
[ ] Summary screen editable: Click "Editar" on dog name → back to step 2; edit; resume
[ ] Email sent after onboarding: Verify in mailbox within 5 min
[ ] Calendar loads in dashboard: < 2s
[ ] Event reschedule: PATCH event to new date → reminders updated
[ ] Multi-language: Switch to EN → all text in English
[ ] Timezone: Create in Buenos Aires → reminders scheduled in Argentina time
[ ] Multi-dog household: Add 2nd dog → both calendars independent; dashboard shows both
```

---

## Phase 4: Database Migrations

### Schema Changes (Phase 2A)

**New Collections:**

```javascript
// dogs.js
db.createCollection("dogs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "breed", "sex", "weightKg", "countryProfile", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "objectId" },
        name: { bsonType: "string", maxLength: 50 },
        birthDate: { bsonType: ["date", "null"] },
        lifeStage: { enum: ["neonatal", "early_puppy", "late_puppy", "young_adult", "adult", "senior", "unknown"] },
        riskProfile: { enum: ["low", "medium", "high"] },
        countryProfile: { enum: ["AR", "UY"] },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.dogs.createIndex({ userId: 1, createdAt: -1 });
db.dogs.createIndex({ countryProfile: 1, lifeStage: 1 });

// vaccineEvents.js
db.createCollection("vaccineEvents");
db.vaccineEvents.createIndex({ dogId: 1, administeredAt: -1 });
db.vaccineEvents.createIndex({ dogId: 1, nextDueAt: 1 });
db.vaccineEvents.createIndex({ status: 1, nextDueAt: 1 });

// dewormingEvents.js
db.createCollection("dewormingEvents");
db.dewormingEvents.createIndex({ dogId: 1, administeredAt: -1 });
db.dewormingEvents.createIndex({ dogId: 1, nextDueAt: 1 });

// appointments.js
db.createCollection("appointments");
db.appointments.createIndex({ dogId: 1, scheduledAt: 1 });

// onboardingSessions.js (TTL: 30 min)
db.createCollection("onboardingSessions");
db.onboardingSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Rollback Strategy

**If onboarding feature causes issues:**

1. **Feature flag OFF**: Set `FEATURE_ONBOARDING_ENABLED=false` in backend env
2. **API disabled**: /api/onboarding/* routes return 503 "Feature disabled"
3. **UI hidden**: Frontend hides "Add Dog" button if feature disabled
4. **Data rollback**: If corrupted data, run:
   ```javascript
   // Remove incomplete onboardings (keep for data recovery)
   db.onboardingSessions.deleteMany({ expiresAt: { $lt: Date.now() } });
   db.dogs.deleteMany({ onboardingCompleted: false, createdAt: { $gt: ISODate("2026-05-14") } });
   ```
5. **Restore from backup**: MongoDB snapshot from pre-deploy (automated)

### Data Seeding for Testing

**Seed script: `backend/scripts/seed-test-data.js`**

```javascript
// Creates 50 dog profiles with varied characteristics
const testDogs = [
  {
    name: "Milo", breed: "Labrador", age: 4, lifeStage: "early_puppy", riskProfile: "medium", country: "AR"
  },
  {
    name: "Luna", breed: "Bulldog", age: 3, lifeStage: "adult", riskProfile: "low", country: "UY"
  },
  // ... 48 more profiles
];

// Creates vaccine/deworming event permutations
const testEvents = [
  // puppy with no history
  // adult with partial history
  // senior with up-to-date vaccines
  // caught-up adult
  // adopted with unknown history
];
```

**Run:** `npm run seed:test-data` (backend only, not production)

---

## Phase 5: Deployment Strategy

### Feature Flag Approach

**Environment Variables:**

```bash
# .env.production
FEATURE_ONBOARDING_ENABLED=true
ONBOARDING_ROLLOUT_COUNTRIES=AR,UY  # Start with AR; add UY in week 2
ONBOARDING_ROLLOUT_PERCENTAGE=10    # Start 10% traffic; ramp 25% → 50% → 100%
REQUIRE_VET_VALIDATION_FOR=AR       # Stricter validation for AR region
```

**Backend Middleware:**

```javascript
// middleware/featureFlags.js
router.post('/api/onboarding/start', (req, res, next) => {
  const enabled = process.env.FEATURE_ONBOARDING_ENABLED === 'true';
  const countryAllowed = process.env.ONBOARDING_ROLLOUT_COUNTRIES
    .split(',')
    .includes(req.body.country);
  const rolloutEnabled = Math.random() * 100 < process.env.ONBOARDING_ROLLOUT_PERCENTAGE;
  
  if (!enabled || !countryAllowed || !rolloutEnabled) {
    return res.status(503).json({ message: "Feature not yet available in your region" });
  }
  next();
});
```

**Frontend Conditional Rendering:**

```javascript
// App.jsx
{process.env.REACT_APP_ONBOARDING_ENABLED === 'true' && <OnboardingCTA />}
```

### Rollout Schedule

**Week 1: Argentina (10% → 25%)**
- Deploy to staging; run full E2E test suite
- Feature flag ON, AR only, 10% traffic
- Monitor error rates, response times, email delivery
- Daily check-in with domain expert (veterinarian validation)
- Day 3: Increase to 25% if metrics green
- Day 4-5: Capture user feedback; fix minor UX issues

**Week 2: Argentina Ramp (50% → 100%) + Uruguay Begin (5%)**
- Increase AR to 50%
- Enable UY at 5%
- Monitor country-specific edge cases (AR clinic names, UY phone formats)

**Week 3: Full Rollout (100% both countries)**
- Both countries at 100%
- Monitor for 1 week
- Prepare launch announcement + help docs

### Monitoring & Metrics

**Key Performance Indicators (KPIs):**

```
Backend:
- POST /api/onboarding/start latency (target: < 100ms)
- POST /api/onboarding/{sessionId}/confirm latency (target: < 2s)
- Calendar generation success rate (target: > 99%)
- Database write errors (target: < 0.1%)

Frontend:
- Onboarding completion rate (target: > 70% for users who start)
- Average time per screen (target: < 90s; flag if > 180s)
- Error rate on form submit (target: < 1%)
- Mobile responsiveness (target: 0 layout shifts)

Email/Notifications:
- Reminder delivery rate (target: > 99%)
- Email open rate (target: > 40%)
- Bounce rate (target: < 0.5%)
- Spam complaints (target: 0)

Clinical Safety:
- Red flag alerts triggered (monitor trend)
- Incomplete calendars marked pending_vet_validation (target: < 20%)
- Vet override rate (target: > 50% for pending calendars)

User Engagement:
- Calendar event completion rate (target: > 60% within 14 days)
- Reminder dismissal rate (target: < 30%)
- Multi-dog adoption (target: > 25% add 2nd dog within 30 days)
```

**Dashboard:** Datadog or New Relic monitoring with Slack alerts for:
- Error rate spike (> 5%)
- Latency degradation (> 2x baseline)
- Calendar generation failures
- Email delivery failures

### Rollback Plan

**Trigger Rollback If:**
- Error rate > 10% for > 5 min
- Email delivery rate < 95% for > 1 hour
- Critical bug (e.g., reminders not scheduling)
- Vet feedback indicates data errors

**Rollback Steps:**
1. Set `FEATURE_ONBOARDING_ENABLED=false` (3 min)
2. Verify /api/onboarding/* return 503
3. Communicate to users (in-app banner)
4. Investigate root cause
5. Deploy fix to staging; re-run E2E tests
6. Deploy to production with feature flag OFF
7. Wait 24h; re-enable at 5% traffic

---

## Phase 6: Tech Stack Decisions

### Backend: Node.js + Express

**Why Chosen:**
- Already in use for Milo Care MVP
- Integrates with existing Mongoose models, EmailService
- Handles concurrent requests well for reminder scheduling
- Supports node-cron for daily reminder batch job

**Alternatives Rejected:**
- Python: Would require new environment; slower integration with existing JS frontend
- Java: Overkill for MVP scope; operational overhead

### Frontend: React 18

**Why Chosen:**
- Existing tech stack; rapid component development
- Redux Toolkit handles multi-step form state elegantly
- Rich ecosystem for calendar (react-big-calendar) and form validation (Zod)

**Alternatives Rejected:**
- Vue: Different ecosystem; slower team ramp-up
- Static HTML: Not interactive enough for 13-screen flow

### Calendar Component Library

**Choice: Custom + react-big-calendar (optional)**
- **Primary**: Custom Vue (simple month grid; show event count per day)
- **Rationale**: Lightweight; integrates easily with Redux; allows deep customization for event statuses (sugerido/vencido/etc.)
- **Alternative**: react-big-calendar for advanced features (future if needed)

### Rules Engine Approach

**Choice: Hardcoded configuration + service methods**

```javascript
// config/vaccinationRules.js
module.exports = {
  AR: {
    puppySchedule: [
      { weekMin: 6, weekMax: 8, vaccines: ["Triple", "Leptospira"] },
      { weekMin: 10, weekMax: 12, vaccines: ["Triple", "Rabies"] },
      // ...
    ],
    mandatoryVaccines: ["Rabies"]
  },
  UY: {
    // Similar structure
  }
};
```

**Rationale**: Simple; deterministic; easy to audit for regulatory compliance
**Alternative Rejected**: Drools/YAML rules engine (too complex for MVP; harder to version control)

### Notification System

**Choice: Existing EmailService + node-cron**

**Rationale:**
- Already integrated with Milo Care backend
- Supports multi-channel (email primary; SMS/web via configuration)
- Scheduled reminder queue reduces real-time spike

**Alternative Rejected:**
- External services (SendGrid, Twilio): Adds vendor lock-in; costs scale with volume

---

## Phase 7: Success Metrics

### Adoption & Engagement

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion rate | 70% | Users who start onboarding / Users who complete onboarding |
| Time-to-complete | 8 min avg | Avg duration from start to confirm |
| Multi-dog adoption | 25% | % users add 2nd dog within 30 days |
| Repeat visits | 40% | % users return to view calendar in 30 days |
| Calendar event completion | 60% | % events marked complete within 14 days of due date |

### Clinical Safety

| Metric | Target | Measurement |
|--------|--------|-------------|
| Red flag detection rate | Capture trend | # red flags triggered / # onboardings |
| Vet validation override | 50% | # pending_vet_validation → approved / total pending |
| Incomplete calendar rate | < 20% | # calendars marked pending_vet_validation / total onboardings |
| Recall rate (user reports data error) | < 2% | Support tickets reporting incorrect schedule / total onboardings |

### Reminders & Notifications

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email delivery rate | 99% | Sent / bounced |
| Email open rate | 40% | Clicked / sent |
| Reminder engagement (click-through) | 30% | Events completed post-reminder / reminders sent |
| Reminder dismissal rate | < 30% | Dismissed / sent |

### Technical Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding step response time | < 500ms | API latency for POST endpoints |
| Calendar load time | < 2s | Page render time for GET /calendar |
| Database write errors | < 0.01% | Write failures / total writes |
| Uptime | 99.9% | Available minutes / total minutes |

### Data Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Missing veterinarian | 20% | Profiles with hasVeterinarian=false / total |
| Unknown age | 10% | Profiles with birthDateConfidence=unknown / total |
| Vaccine history import rate | 60% | Onboardings with >= 1 prior vaccine / total |
| Weight outliers | < 1% | Records with weight > 100kg or < 1kg / total |

---

## Phase 8: Dependencies & Blockers

### External Dependencies

1. **Breed Database**
   - Decision: Embed 200+ breed JSON in backend
   - Resource: Breed data source (AKC, FCI, or merged dataset)
   - Timeline: Week 1
   - Risk: Incomplete breeds → mitigation: Allow custom breed entry + vet override

2. **Veterinarian Validation Process**
   - Requirement: Domain expert to validate AR/UY vaccine schedules
   - Resource: Consulting veterinarian (1-2 hours review)
   - Timeline: Week 1 (pre-development) + Week 3 (QA sign-off)
   - Risk: Disagreement on schedule → mitigation: Document assumptions; allow vet to override per-dog

3. **AR/UY Vaccination Regulations**
   - Requirement: Current rabies mandate, leptospira guidance, deworming frequency
   - Resource: Official sources (SENASA AR, MGAP UY) or consulting vet
   - Timeline: Week 0 (before Phase 0 research)
   - Risk: Regulation changes → mitigation: Version rules config; include release notes

4. **i18n Infrastructure**
   - Requirement: Existing i18n system extended for onboarding strings
   - Resource: Use existing `/frontend/src/i18n/` structure; add `onboarding-es.json`, `onboarding-en.json`
   - Timeline: Week 3 (Phase 2B)
   - Risk: Missing translations → mitigation: 1st release ES-only; EN in follow-up

5. **Timezone Database**
   - Requirement: Map user city → timezone (Buenos Aires → America/Argentina/Buenos_Aires)
   - Resource: User selection during onboarding + auto-detect via browser
   - Timeline: Week 1 (built into OwnerProfileForm)
   - Risk: Incorrect mapping → mitigation: Allow manual timezone override

### Blockers & Mitigation

| Blocker | Impact | Mitigation |
|---------|--------|-----------|
| Breed database incomplete | Scores of breeds missing; users frustrated | Start with 100 common breeds; allow "Other" + vet override |
| Vet validation delayed | Can't launch safely | Have contingency: In-house review; hire freelance vet consultant |
| Vaccine regulation unclear | Incorrect schedules generated | Use conservative defaults (e.g., annual rabies) + require vet approval |
| Email delivery issues | Reminders don't reach users | Pre-test email templates; use existing EmailService (proven) |
| Mobile form UX issues | High mobile abandonment | Include responsive design in Phase 2B; manual mobile QA in Phase 2E |

---

## Phase 9: Backlog with T-shirt Sizing

### Core Backlog (MVP)

| Task | Size | Phase | Description |
|------|------|-------|-------------|
| **Backend Models & Schema** | | | |
| Create Dog model | M | 2A | Schema, indexes, validation |
| Create VaccineEvent model | M | 2A | Status tracking, FK to Dog |
| Create DewormingEvent model | M | 2A | Similar to VaccineEvent |
| Create Appointment model | S | 2A | Vet appointments |
| Create OnboardingSession model | M | 2A | Transient, TTL 30 min |
| **Backend Services** | | | |
| ValidationService | L | 2A | Email, breed, birth date, weight, age |
| BreedDatabaseService | M | 2A | Embed 200 breeds; fuzzy search |
| RedFlagDetector | M | 2A | Symptom analysis; emergency alert |
| OnboardingService | L | 2A | Session lifecycle; step validation |
| CalendarEngine | L | 2C | Vaccine + deworming + checkup generation |
| VaccineRulesEngine | L | 2C | AR/UY mandate logic; next-due calculation |
| RiskProfileCalculator | M | 2C | Lifestyle → risk mapping |
| ReminderScheduler | M | 2D | Cron job integration; email send |
| **Backend Routes & Middleware** | | | |
| POST /api/onboarding/start | M | 2A | Create session |
| POST /api/onboarding/{sessionId}/* | L | 2A | All step-save endpoints |
| GET /api/onboarding/{sessionId}/summary | M | 2A | Draft data |
| POST /api/onboarding/{sessionId}/confirm | L | 2C | Calendar generation |
| GET /api/dogs/{dogId}/calendar | L | 2C | Fetch events |
| PATCH /api/events/{eventId}/status | M | 2D | Event completion |
| Feature flag middleware | M | 2E | Rollout control |
| **Frontend Components** | | | |
| DogOnboardingPage orchestrator | M | 2B | Multi-step form container |
| StepIndicator | S | 2B | Progress tracker |
| OwnerProfileForm | M | 2B | Screen 1 |
| DogBasicInfoForm | M | 2B | Screen 2-3 |
| ClinicalHistoryForm (Pt 1 & 2) | L | 2B | Screen 4-5; includes RedFlagAlert |
| LifestyleForm | M | 2B | Screen 6; risk calc display |
| VaccinationRecordForm | M | 2B | Screen 7; photo upload |
| DewormingHistoryForm | S | 2B | Screen 8 |
| SummaryReview | M | 2B | Screen 9 |
| CalendarDraft | L | 2B | Screen 10; event card display |
| MissingDataScreen | S | 2B | Screen 11 |
| ConfirmScreen | S | 2B | Screen 12 |
| SuccessScreen | S | 2B | Screen 13 |
| BreedSearchInput | M | 2B | Autocomplete component |
| DateRangeValidator | S | 2B | Conflict detection |
| RiskProfileBadge | S | 2B | Status indicator |
| EmergencyContactList | M | 2B | 24h vet numbers (AR/UY) |
| RedFlagAlert overlay | M | 2B | Blocks progression |
| DisclosureWarning footer | S | 2B | Clinical disclaimer |
| **Frontend State Management** | | | |
| Redux onboardingSlice | M | 2B | Multi-step state; validation errors |
| Custom hooks (useOnboarding, useCurrentStep) | S | 2B | Redux helpers |
| **Frontend Validation** | | | |
| Zod schemas for each step | L | 2B | Client-side validation |
| **Frontend Services** | | | |
| onboardingApi.js | M | 2B | Session + step API calls |
| calendarApi.js | M | 2C | Calendar endpoints |
| **Testing** | | | |
| Unit tests (ValidationService, etc.) | L | 2E | 150+ test cases |
| Integration tests (session lifecycle) | L | 2E | 20+ scenarios |
| E2E tests (happy path + edge cases) | L | 2E | 10 complete user journeys |
| Performance tests (load calendar) | M | 2E | Latency targets |
| Accessibility audit (WCAG A) | M | 2E | Screen reader testing |
| Manual QA checklist | M | 2E | 25+ manual scenarios |
| **Database & Deployment** | | | |
| Database migration script | M | 2A | Create collections + indexes |
| Seed test data script | M | 2E | 50 dog profiles |
| Feature flag environment setup | M | 2E | Rollout configuration |
| Monitoring & alerting setup | M | 2E | Datadog/New Relic |
| Rollback procedure documentation | S | 2E | Safety net |
| API documentation (OpenAPI) | M | 2E | Developer guide |
| Deployment guide | M | 2E | Step-by-step rollout |
| Release notes + help docs | M | 2E | User-facing communication |

### Optional / Post-MVP

| Task | Size | Phase | Description |
|------|------|-------|-------------|
| **Enhancements** | | | |
| External breed API integration | L | Future | Remove embedded database; call AKC/FCI API |
| Rules-as-data (YAML config) | M | Future | Non-developers can edit vaccine schedules |
| ML-based risk profiling | L | Future | Predict risk score from historical data |
| QR-code vaccine record import | M | Future | Scan libreta sanitaria via phone camera |
| Vet clinic integrations | XL | Future | Sync vaccination records with clinic systems |
| SMS + Web push notifications | M | Future | Beyond email |
| Audit trail for compliance | M | Future | Track who changed what, when |
| Calendar export (PDF/iCal) | S | Future | User downloads vaccination schedule |
| Multilingual support (expand) | M | Future | Add PT, EN, FR, etc. |
| Mobile native app | XL | Future | iOS/Android-specific UX |
| **Bug fixes** | | | |
| [Capture during Phase 2E QA] | S-M | 2E | Fix as discovered |

---

## Summary & Next Steps

1. **Phase 0 (Research)**: Validate design decisions; document assumptions
2. **Phase 2A (Data Model)**: Build foundation; establish data contracts
3. **Phase 2B (UI + Forms)**: Implement 13-screen flow; Redux state management
4. **Phase 2C (Calendar Engine)**: Generate schedules; apply regional rules
5. **Phase 2D (Reminders)**: Integrate with email; schedule via cron
6. **Phase 2E (Polish + Testing)**: Full E2E testing; launch preparation

**Total Timeline**: 3-4 weeks (depends on team size + parallelization)

**Team Composition**:
- 1 Backend Engineer (Node.js, MongoDB)
- 1 Frontend Engineer (React, Redux)
- 1 QA Engineer (E2E testing, manual QA)
- 0.5 Domain Expert (Veterinarian review, regulatory validation)

**Kickoff Date**: Week of May 19, 2026

**Expected MVP Launch**: Week of June 2, 2026 (AR only, 10% rollout)
