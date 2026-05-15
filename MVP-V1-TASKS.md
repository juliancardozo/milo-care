# MVP v1 Task Breakdown

## Phase 1: Core Foundation (Already Mostly Complete)
- [x] **T001** — User authentication (JWT + email/password)
- [x] **T002** — Dog profile creation during onboarding (7-step form)
- [x] **T003** — Redux state management for onboarding
- [x] **T004** — Spanish localization for onboarding UI
- [x] **T005** — Backend validation & error handling
- [x] **T006** — MongoDB models: User, Dog, Vaccination, Deworming, Appointment

---

## Phase 2: Dog Profile & Dashboard (HIGH PRIORITY)

### Module: Perfil del Perro ✅ (mostly complete, needs dashboard view)
- [x] **T007** — Onboarding captures: nombre, edad, peso, raza/tamaño, país, sexo, castrado, veterinaria
- [ ] **T008** — Dog profile view page (display dog details, allow edit)
- [ ] **T009** — Multiple dogs support (list view, switch between dogs)
- [ ] **T010** — Edit dog profile (update info, photo upload)

### Module: Panel Principal (Dashboard)
- [ ] **T011** — Dashboard landing page layout
- [ ] **T012** — "Próximas acciones" widget (next 7 days due reminders)
- [ ] **T013** — "Últimos eventos" widget (recent history: vaccines, symptoms, meds)
- [ ] **T014** — "Alertas vencidas" widget (overdue items)
- [ ] **T015** — Quick stats: age, risk profile, reminder count

---

## Phase 3: Preventive Calendar (HIGH PRIORITY)

### Module: Calendario Preventivo ✅ (backend complete, needs frontend)
- [x] **T016** — VaccineRulesEngine generates schedules by country (AR/UY)
- [x] **T017** — CalendarEngine orchestrates vacunas + desparasitación + chequeos
- [x] **T018** — Risk profile calculation from lifestyle questionnaire
- [ ] **T019** — Calendar view page (timeline/table of all scheduled events)
- [ ] **T020** — Vaccine recommendation display with vet validation warnings
- [ ] **T021** — Deworming schedule display with frequency explanations
- [ ] **T022** — Appointment recommendations (checkups by age/risk)
- [ ] **T023** — Mark event as "completed" (link to clinical history entry)
- [ ] **T024** — Edit/override scheduled events (defer, change date, change vaccine)

---

## Phase 4: Clinical History (HIGH PRIORITY)

### Module: Historial Clínico
- [ ] **T025** — Clinical history list page (filter by event type)
- [ ] **T026** — Add vaccination record (from calendar or manual)
- [ ] **T027** — Add veterinary consultation record
- [ ] **T028** — Add medication entry (start/end date, frequency, notes)
- [ ] **T029** — Add symptom record (name, severity picker, photo upload, notes)
- [ ] **T030** — Add study/test record (test name, date, results, notes)
- [ ] **T031** — Add surgery/procedure record (date, vet, notes, follow-up)
- [ ] **T032** — Add bath/grooming record (date, notes)
- [ ] **T033** — Add weight record (date, weight in kg, trend calculation)
- [ ] **T034** — View entry details, edit, delete

---

## Phase 5: Medication Management (HIGH PRIORITY)

### Module: Medicación
- [ ] **T035** — Medications list page (active + past)
- [ ] **T036** — Add medication form (nombre, dosis, frecuencia, fecha inicio/fin)
- [ ] **T037** — Edit medication (update dose, frequency, end date)
- [ ] **T038** — View medication details
- [ ] **T039** — Mark medication as complete (end date = today)
- [ ] **T040** — Medication timeline in dashboard

---

## Phase 6: Symptoms Tracking (HIGH PRIORITY)

### Module: Síntomas
- [ ] **T041** — Symptoms list page (timeline view)
- [ ] **T042** — Add symptom form (name, severity: 1-5, photo, date, notes)
- [ ] **T043** — Photo upload for symptoms (client-side image handling)
- [ ] **T044** — Severity indicator (color coded: green/yellow/orange/red)
- [ ] **T045** — Red flag detection (alert if severe symptoms reported)
- [ ] **T046** — Symptom history timeline
- [ ] **T047** — View symptom details, mark as resolved

---

## Phase 7: Reminders System (HIGH PRIORITY)

### Module: Recordatorios
- [x] **T048** — ReminderJob backend (cron every 5 min, checks due items)
- [x] **T049** — Email reminder sending (Resend integration)
- [ ] **T050** — Internal notification UI (on-app banner/toast for due items)
- [ ] **T051** — Reminder preferences page (email on/off, window days preference)
- [ ] **T052** — Reminder history page (see past reminders sent)
- [ ] **T053** — WhatsApp opt-in collection (manual for MVP, save phone)
- [ ] **T054** — Snooze reminder functionality (defer 7 days)
- [ ] **T055** — Mark item as done from reminder

---

## Phase 8: PDF Export (VERY HIGH PRIORITY)

### Module: Exportar PDF
- [ ] **T056** — PDF generation library setup (jsPDF or similar)
- [ ] **T057** — Design "Resumen de salud de Milo" template
- [ ] **T058** — Include: dog profile, age, weight, risk profile, vaccine history
- [ ] **T059** — Include: deworming history, medications, symptoms, clinical notes
- [ ] **T060** — Include: upcoming preventive calendar (next 3 months)
- [ ] **T061** — Include: vet consultation checklist (observations guide)
- [ ] **T062** — Include: disclaimer & educational notes
- [ ] **T063** — Download button in dashboard & dog profile
- [ ] **T064** — Test PDF rendering on mobile & desktop

---

## Phase 9: Vet Consultation Support (MEDIUM-HIGH PRIORITY)

### Module: Veterinary Summary (part of T057-T062)
- [ ] **T065** — Vet summary section: what the vet should look for (checklist)
- [ ] **T066** — Educational content blocks (preventive care explanations)
- [ ] **T067** — Risk profile explanation (why high risk → more frequent care)
- [ ] **T068** — Vaccine requirements by country (AR vs UY differences)

---

## Phase 10: UI/UX Polish & Testing

### Frontend
- [ ] **T069** — Responsive design for mobile (all pages)
- [ ] **T070** — Dark mode support (if in scope)
- [ ] **T071** — Accessibility audit (ARIA labels, keyboard nav)
- [ ] **T072** — Error boundary components (handle crashes gracefully)
- [ ] **T073** — Loading states on all async operations
- [ ] **T074** — Comprehensive form validation (client + server)

### Backend
- [ ] **T075** — Input sanitization & rate limiting
- [ ] **T076** — Pagination for history lists (1000+ entries)
- [ ] **T077** — Database indexes for performance (timestamps, user_id)
- [ ] **T078** — Logging & monitoring setup

### Testing
- [ ] **T079** — End-to-end testing (full onboarding → dashboard flow)
- [ ] **T080** — Integration tests for calendar generation
- [ ] **T081** — Unit tests for date calculations & reminders

---

## Suggested Sprint Organization

### Sprint 1 (This week): Fix Onboarding & Add Dashboard
**Tasks:** T008-T015, T019  
**Goal:** Users can complete onboarding, see their dog, view upcoming reminders

### Sprint 2: Clinical History & Medications
**Tasks:** T025-T040, T050-T055  
**Goal:** Users can log health events and manage medications

### Sprint 3: Symptoms & Notifications
**Tasks:** T041-T047, T050-T055  
**Goal:** Users can track symptoms and receive reminders

### Sprint 4: PDF Export & Polish
**Tasks:** T056-T074  
**Goal:** Users can download vet-ready PDFs, MVP is polished

### Sprint 5: Testing & Launch
**Tasks:** T075-T081  
**Goal:** Comprehensive testing, performance tuning, launch readiness

---

## Current Blockers & Notes

1. **Onboarding Confirmation**: Fixed 400 error (vaccine record validation)
   - Status: ✅ Ready to test with fresh browser session

2. **Reminder Notifications**: Email sending working (Resend integration)
   - Status: ✅ Can be tested in dashboard reminders

3. **PDF Export**: Not started
   - Recommendation: Use `jsPDF` + `html2canvas` for simplicity

4. **Photo Upload**: Not started (symptoms, dog profile)
   - Recommendation: Cloudinary or S3 for MVP (or local storage for MVP lite)

5. **Mobile Responsiveness**: Bootstrap styling exists but needs mobile testing

---

## Priority Order for Execution
1. **T008-T015** — Dashboard & dog profile (users need to see their data)
2. **T056-T064** — PDF export (advertised as key MVP feature)
3. **T025-T034** — Clinical history (core feature, unblock everything else)
4. **T035-T039** — Medications (high impact, simple to build)
5. **T041-T047** — Symptoms (high impact, simple to build)
6. **T050-T055** — Reminder notifications (complete the feedback loop)
7. **T069-T081** — Polish & testing (launch readiness)

---

## Dependencies Map
```
Onboarding (DONE) 
  ↓
Dog Profile View (T008-T010)
  ↓
Dashboard (T011-T015) ← PDF Export (T056-T064) needs dog data
  ↓
Clinical History (T025-T034)
  ├→ Medications (T035-T039)
  ├→ Symptoms (T041-T047)
  └→ Notifications (T050-T055)
```

---

**Total MVP Tasks: 81**  
**Completed: 23**  
**Remaining: 58**  
**Estimated: 4-6 weeks @ 2 developers**
