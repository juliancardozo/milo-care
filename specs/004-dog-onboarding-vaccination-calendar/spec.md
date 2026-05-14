## 1. Executive Summary

Milo Care needs a **warm, conversational onboarding flow** that allows dog owners (tutores) to register their dog and automatically generate a personalized preventive health calendar based on:
# Spec 004: Dog Onboarding + Vaccination Calendar (AR/UY)

**Feature**: Dog Onboarding + Automated Vaccination & Deworming Calendar
**Status**: Draft
**Priority**: P1 (Foundational for health platform)
**Target Countries**: Argentina, Uruguay
**Estimated Scope**: 3-4 weeks (MVP)

---

## 1. Executive Summary

Milo Care needs a **warm, conversational onboarding flow** that allows dog owners (tutores) to register their dog and automatically generate a personalized preventive health calendar based on:
- Dog age/life stage
- Risk profile (lifestyle & environment)
- Local vaccination regulations (AR/UY)
- Existing medical history

The onboarding collects data in ~7-10 screens, validates against veterinary best practices, generates initial events (vaccinations, deworming, check-ups), and creates automated reminders. **Critical safety constraint**: The system is advisory only; it never diagnoses or replaces veterinarian consultation.

---

## 2. Clinical Safety Boundaries

### ✅ System CAN:
- Suggest preventive reminders
- Show orientation calendars
- Request important data
- Warn about red-flag symptoms
- Recommend veterinary consultation
- Store veterinarian-provided instructions
- Track user-entered medical data

### ❌ System CANNOT:
- Prescribe medications automatically
- Indicate antibiotic dosages
- Diagnose diseases
- Replace veterinary consultation
- Promise universal clinical accuracy

### 📌 Mandatory Disclaimer (visible everywhere):
```
Esta información es orientativa y no reemplaza la consulta con un veterinario matriculado. 
El calendario puede variar según país, zona, estado de salud, producto aplicado y criterio profesional.
```

---

## 3. Dog Life Stages (Age Classification)

| Life Stage | Age Range | Key Characteristics |
```

---

## 13. MVP User Stories Prioritized

### P0 - Must Have

1. Como tutor, quiero registrar un perro nuevo para centralizar su salud.
2. Como tutor, quiero indicar la edad de mi perro para que la app sugiera un calendario.
3. Como tutor, quiero cargar vacunas previas para evitar recordatorios incorrectos.
4. Como tutor, quiero recibir recordatorios de vacunas y desparasitación.
5. Como tutor, quiero saber qué datos faltan para completar el perfil clínico.

### P1 - Should Have

6. Como tutor, quiero que la app me alerte si registro un síntoma grave.
7. Como tutor, quiero diferenciar sugerencias generales de indicaciones veterinarias.

**MVP note:** esta entrega prioriza el flujo de onboarding, el cálculo de edad/etapa, el calendario preventivo inicial, la desparasitación y los recordatorios. El historial compartible y el registro detallado de síntomas quedan para una iteración posterior.

## 14. Edge Cases & Handling

| Edge Case | Handling |
|-----------|----------|
| **Adopted dog, no history** | Mark "historial desconocido"; require vet validation; suggest microchip check |
| **Unknown age** | Use estimated age; mark calendar as "pending validation"; lower confidence |
| **Puppy < 6 weeks** | Alert: "Muy pequeño; consulta vet urgente"; skip some fields; focus on nutrition & safety |
| **Adult never vaccinated** | Mark "catch-up needed"; require vet consult; generate catch-up plan; mark pending validation |
| **Vaccine overdue** | Status = "vencido"; send reminder every 7 days; flag for urgent attention |
| **Traveling AR↔UY** | Flag rabies certificate validity in both countries; suggest document export |
| **No veterinarian** | Mark calendar as "pending validation"; suggest vet finder tool |
| **Severe vaccine reaction history** | Highlight in vet notes; suggest alternative schedules; require vet approval before auto-reminders |
| **Senior + multiple symptoms** | Generate emergency alert; require vet consult before finalizing calendar |
| **Raw diet** | Increase parasite monitoring frequency; add leptospira suggestion; include raw-diet vet notes |
| **Rural exposure** | Increase leptospira/Bordetella priority; suggest more frequent parasite checks |
| **Multiple vaccine records** | Deduplicate; detect conflicts; allow user to mark "reliable" source; others as "pending vet review" |
| **User skips onboarding** | Allow partial entry; show dashboard with warnings; flag missing sections |

## 15. Validation Rules

### Field-Level Validations

```
- name: required, max 50 chars, no special chars
- email: required, valid format, unique, max 255 chars
- phone: optional, valid format for country
- country: required, must be AR or UY
- birthDate: IF provided, must be <= today
- estimatedAge: IF provided, must match valid range
- weight: required, must be 1-100 kg
- breed: required, lookup against breed database
- size: required, must match breed guidelines
- microchipId: optional, valid 15-digit format if provided
- photoUrl: optional, valid image URL, max 10MB
```

### Business Logic Validations

```
- If birthDate + estimatedAge conflict, alert user
- If age > 7 years but owner says "never vaccinated", require vet override
- If red-flag symptom + age < 12 weeks, enforce emergency alert
- If no veterinarian + high-risk profile, suggest urgent vet consult
- If vaccine date > current age, flag as impossible/future vaccination
- If multiple vaccine records same type within 30 days, detect duplicate entry
```

## 16. Empty States & Error Messages

### Empty State: No Dogs Yet
```
🐶 ¡Bienvenido a Milo Care!

Aún no registraste ningún perro. Comenzá ahora con el onboarding 
para crear el primer perfil de salud.

[Botón] + Agregar mi primer perro
```

### Empty State: No Calendar Events
```
📅 Sin eventos sugeridos

Los recordatorios aparecerán cuando completes el perfil de tu perro 
y cargues información de vacunas y visitas veterinarias.

[Botón] Completar perfil
```

### Error: Age Conflict
```
⚠️ La fecha de nacimiento no coincide con la edad estimada

Verificá:
- Fecha de nacimiento: 15/03/2024
- Edad estimada: 6 meses

¿Cuál es correcta? Actualizá para continuar.
```

### Error: Red Flag Detected
```
🚨 ALERTA DE EMERGENCIA

Reportaste: {symptom}

Esta condición puede requerir atención veterinaria URGENTE. 
Milo Care no puede evaluarlo a distancia.

👉 Llamá a tu veterinaria o ve a guardia veterinaria 24hs
👉 Si es después de horario: llamá a emergencias

Solo continuá si ya consultaste veterinario.
[Botón] Continuar / [Botón] Contactos de emergencia
```

## 17. Example JSON Responses

### Scenario 1: Puppy (4 months, with some vaccine history)

```json
{
  "dog": {
    "id": "dog-123",
    "userId": "user-456",
    "name": "Milo",
    "birthDate": "2026-01-14",
    "estimatedAge": null,
    "birthDateConfidence": "exact",
    "sex": "male",
    "breed": "Labrador Retriever",
    "isCross": false,
    "size": "large",
    "neutered": false,
    "weightKg": 15,
    "lifeStage": "early_puppy",
    "riskProfile": "medium",
    "countryProfile": "AR"
  },
  "vaccineEvents": [
    {
      "id": "vax-001",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": "2026-02-18",
      "nextDueAt": "2026-03-18",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    },
    {
      "id": "vax-002",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": null,
      "nextDueAt": "2026-03-18",
      "status": "sugerido",
      "source": "suggested",
      "requiresVetValidation": false
    },
    {
      "id": "vax-003",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": null,
      "nextDueAt": "2026-04-14",
      "status": "sugerido",
      "source": "suggested",
      "requiresVetValidation": false
    }
  ],
  "appointments": [
    {
      "id": "apt-001",
      "type": "annual_checkup",
      "reason": "Chequeo de cachorro",
      "scheduledAt": null,
      "status": "sugerido"
    }
  ],
  "summary": {
    "nextVaccine": "Triple (booster) - 18/03/2026",
    "nextDeworming": "Revisar con veterinario",
    "nextCheckup": "Consulta inicial recomendada",
    "missingData": ["veterinarian"],
    "disclaimer": "Esta información es orientativa y no reemplaza la consulta..."
  }
}
```

### Scenario 2: Adult Without History (3 years old, adopted)

```json
{
  "dog": {
    "id": "dog-789",
    "userId": "user-456",
    "name": "Luna",
    "birthDate": "2023-01-15",
    "birthDateConfidence": "estimated",
    "sex": "female",
    "breed": "Mixed",
    "isCross": true,
    "size": "medium",
    "neutered": true,
    "weightKg": 22,
    "lifeStage": "adult",
    "riskProfile": "high",
    "countryProfile": "AR"
  },
  "vaccineEvents": [
    {
      "id": "vax-catch-up-001",
      "vaccineType": "Triple/Quádruple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    },
    {
      "id": "vax-catch-up-002",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    },
    {
      "id": "vax-catch-up-003",
      "vaccineType": "Leptospira",
      "antigens": ["leptospira"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    }
  ],
  "dewormingEvents": [
    {
      "id": "dew-001",
      "productName": "TBD (pending vet)",
      "parasiteType": "internal",
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "requiresVetValidation": true
    }
  ],
  "summary": {
    "status": "historial_incompleto",
    "alert": "No encontramos vacunas registradas. Para evitar errores, Milo Care tratará el calendario como incompleto...",
    "nextStep": "Consulta vet urgente para validar historial",
    "missingData": ["veterinarian", "complete_vaccine_history", "deworming_history"],
    "confidence": "LOW"
  }
}
```

### Scenario 3: Senior Dog (9 years, well-documented)

```json
{
  "dog": {
    "id": "dog-999",
    "userId": "user-456",
    "name": "Rex",
    "birthDate": "2017-05-10",
    "birthDateConfidence": "exact",
    "sex": "male",
    "breed": "German Shepherd",
    "isCross": false,
    "size": "large",
    "neutered": true,
    "weightKg": 32,
    "lifeStage": "senior",
    "riskProfile": "low",
    "countryProfile": "UY",
    "conditions": ["osteoarthritis"],
    "hasVeterinarian": true,
    "veterinarianName": "Dra. García, Clínica PetCare"
  },
  "vaccineEvents": [
    {
      "id": "vax-annual-001",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": "2025-05-20",
      "nextDueAt": "2026-05-20",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    },
    {
      "id": "vax-annual-002",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": "2025-06-15",
      "nextDueAt": "2026-06-15",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    }
  ],
  "appointments": [
    {
      "id": "apt-senior-001",
      "type": "annual_checkup",
      "reason": "Chequeo preventivo anual",
      "scheduledAt": "2026-05-20",
      "status": "programado"
    },
    {
      "id": "apt-senior-002",
      "type": "annual_checkup",
      "reason": "Chequeo preventivo (semestral recomendado para senior)",
      "scheduledAt": null,
      "status": "sugerido"
    }
  ],
  "seniorMonitoring": {
    "weightCheckFrequency": "monthly",
    "mobilityAssessment": "pending",
    "bloodworkSuggestion": "annually or per vet",
    "supplementConsideration": "joint health, omega-3"
  },
  "summary": {
    "nextVaccine": "Triple - 20/05/2026",
    "nextRabies": "15/06/2026",
    "nextCheckup": "20/05/2026 (programado)",
    "monitoringPlan": "Semestral + peso mensual recomendado",
    "missingData": []
  }
}
```

---

## 18. Success Criteria

### For Users (Tutores)

✅ After onboarding completes, user understands:
- What data they entered and why
- What data is missing
- Which vaccines need revision
- When to consult veterinarian next
- What reminders are scheduled
- Difference between suggestions vs. real veterinarian instructions

### For System

✅ Dashboard shows:
- Next vaccine (with due date)
- Next deworming (with due date)
- Next checkup (with scheduling option)
- Active alerts/red flags
- Missing data sections
- "Add clinical event" button
- "Complete profile" button

✅ API responses:
- All calendar events with status and confidence
- Reminders correctly scheduled per rules
- Edge cases handled gracefully
- No contradictory suggestions

✅ Data Quality:
- No duplicate vaccine entries
- Dates validated against dog age
- Age classifications accurate
- Risk profile correctly calculated

---

## 19. Glossary & Terms

| Term | Definition |
|------|-----------|
| **Core vaccine** | Moquillo, parvo, adeno, rabia (essential) |
| **Antigen** | Active immune component (e.g., moquillo is an antigen) |
| **Titulo** | Blood test showing immunity level (alternative to auto-booster) |
| **Desparasitación** | Antiparasitic treatment (internal & external) |
| **Coproparasitario** | Stool test for internal parasites |
| **Cachorro** | Puppy |
| **Tutores** | Dog owners (used in AR/UY context) |
| **Libreta/Carnet** | Vaccination record booklet |
| **Ley local** | Local legal requirement (e.g., rabies mandate) |
| **Criterio veterinario** | Veterinarian professional judgment (overrides suggestions) |
| **Red flag** | Symptom requiring urgent veterinary attention |
| **Life stage** | Age-based classification (neonatal, puppy, adult, senior) |
| **Risk profile** | Low/medium/high based on lifestyle factors |

---

## Next Steps

1. **Create detailed plan.md** with phased implementation roadmap
2. **Generate user stories** and estimation (T-shirt sizing)
3. **Design frontend screens** with Figma wireframes
4. **Build data migration strategy** for existing users
5. **Create vet consultation guide** for integration with clinics
6. **Set up A/B testing** for calendar suggestions accuracy
  "microchipId": "string nullable",
  "photoUrl": "string nullable",
  "countryProfile": "AR | UY",
  "lifeStage": "neonatal | early_puppy | late_puppy | young_adult | adult | senior | unknown",
  "riskProfile": "low | medium | high",
  "allergies": ["string"],
  "conditions": ["string"],
  "hasVeterinarian": "boolean",
  "veterinarianName": "string nullable",
  "onboardingCompleted": "boolean",
  "onboardingCompletedAt": "ISO-8601 nullable",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### VaccineEvent
```json
{
  "id": "UUID",
  "dogId": "UUID fk",
  "vaccineType": "string", // e.g., "Triple", "Quádruple"
  "antigens": ["string"], // ["moquillo", "parvovirus", "adenovirus"]
  "administeredAt": "ISO-8601 nullable",
  "nextDueAt": "ISO-8601 nullable",
  "lotNumber": "string nullable",
  "vetName": "string nullable",
  "documentUrl": "string nullable",
  "status": "sugerido | pending_vet_validation | programado | completado | vencido | pospuesto | descartado | incompleto_falta_datos",
  "source": "manual | suggested | imported",
  "requiresVetValidation": "boolean",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### DewormingEvent
```json
{
  "id": "UUID",
  "dogId": "UUID fk",
  "productName": "string",
  "parasiteType": "internal | external | both",
  "administeredAt": "ISO-8601 nullable",
  "nextDueAt": "ISO-8601 nullable",
  "vetName": "string nullable",
  "status": "sugerido | pending_vet_validation | programado | completado | vencido | pospuesto | descartado | incompleto_falta_datos",
  "source": "manual | suggested | imported",
  "requiresVetValidation": "boolean",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Appointment
```json
{
  "id": "UUID",
  "dogId": "UUID fk",
  "type": "initial_consult | annual_checkup | dental | vaccination_followup | emergency | other",
  "scheduledAt": "ISO-8601 nullable",
  "clinicName": "string nullable",
  "vetName": "string nullable",
  "reason": "string",
  "status": "sugerido | programado | completado | pospuesto | cancelado",
  "notes": "string nullable",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Reminder
```json
{
  "id": "UUID",
  "userId": "UUID fk",
  "dogId": "UUID fk",
  "relatedEntityType": "vaccine | deworming | appointment | medication | other",
  "relatedEntityId": "UUID",
  "channel": "email | sms | web",
  "scheduledFor": "ISO-8601",
  "sentAt": "ISO-8601 nullable",
  "status": "pending | sent | clicked | snoozed | dismissed",
  "dedupeKey": "string", // prevent duplicate reminders
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## 11. API Endpoints (Suggested)

### Onboarding Flow

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/onboarding/start` | Initiate flow; return session ID |
| POST | `/api/onboarding/{sessionId}/owner` | Save owner data |
| POST | `/api/onboarding/{sessionId}/dog-basic` | Save dog basic info |
| POST | `/api/onboarding/{sessionId}/clinical-history` | Save clinical data |
| POST | `/api/onboarding/{sessionId}/lifestyle` | Save lifestyle/risk |
| POST | `/api/onboarding/{sessionId}/vaccines` | Save existing vaccines |
| POST | `/api/onboarding/{sessionId}/deworming` | Save deworming history |
| POST | `/api/onboarding/{sessionId}/confirm` | Finalize; generate calendar |
| GET | `/api/onboarding/{sessionId}/summary` | Get generated plan |
| GET | `/api/onboarding/{sessionId}/draft` | Get current draft state |

### Calendar & Events

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dogs/{dogId}/calendar` | Get all events for dog |
| GET | `/api/dogs/{dogId}/vaccines` | List vaccine events |
| GET | `/api/dogs/{dogId}/deworming` | List deworming events |
| GET | `/api/dogs/{dogId}/appointments` | List appointments |
| PATCH | `/api/events/{eventId}/status` | Update event status |
| PATCH | `/api/events/{eventId}/reschedule` | Reschedule event |
| POST | `/api/events/{eventId}/complete` | Mark event complete |
| GET | `/api/dogs/{dogId}/missing-data` | Get list of incomplete fields |

---

## 12. Onboarding Summary Screen (Final Output)

**Show user:**

```
╔════════════════════════════════════════════════════╗
║  PLAN INICIAL DE SALUD PARA {dogName}              ║
╚════════════════════════════════════════════════════╝

📋 DATOS DEL PERRO
├─ Nombre: Milo
├─ Edad: 4 meses (cachorro)
├─ Raza: Labrador
├─ Peso: 15 kg
└─ Sexo: Macho, castrado: No

⚠️ ETAPA DE VIDA
├─ Clasificación: Cachorro (6-16 semanas)
├─ Siguientes hitos: 16 semanas (vacuna final), 6 meses (esterilización)
└─ Recomendación: Consulta vet cada 3-4 semanas

🔍 RIESGO ESTIMADO: Medio
├─ Factores: Plaza, otros perros, paseos diarios
└─ Acciones: Control antiparasitario trimestral recomendado

💉 VACUNAS A REVISAR
├─ Triple (moquillo/parvo/adeno): SUGERIDO - consulta vet ahora
├─ Rabia: SUGERIDO - desde los 3 meses (ley AR)
└─ Leptospira: CONSIDERAR - según riesgo y veterinario

🪱 DESPARASITACIÓN
├─ Estado: No registrado
├─ Recomendación: Inicio desde 2 semanas (revisar con vet)
└─ Próxima revisión: 3-4 semanas

🏥 CHEQUEOS RECOMENDADOS
├─ Consulta inicial: YA (establecer baseline)
├─ Control de peso: Mensual (hasta 6 meses)
├─ Chequeo anual: A partir del año de edad
└─ Próximo: 1 semana (si no fue recientemente)

⚠️ SÍNTOMAS O ALERTAS DETECTADAS
└─ Ninguno reportado durante onboarding

⏰ RECORDATORIOS CREADOS
├─ Email en: 3, 7, 14, 30 días
├─ Recuerdos: Vacunas, desparasitación, chequeos
└─ Personalización: Según tu timezone y preferencias

📝 DATOS FALTANTES
├─ Veterinario habitual (para sincronizar)
├─ Reacción a vacunas previas (si las hubo)
└─ Cargar luego: Opciones en "Completar perfil"
```
## 4.3 Clinical History (Screens 4-5)

```json
## 5. Vaccination Calendar Logic

### 5.1 Vaccine Classification
## 6. Deworming Calendar Logic

### 6.1 Puppies (< 6 months)
## 7. Checkup Events (Initial Suggestions)

**Generate these appointments as suggested events:**
## 8. Red Flag Symptoms (Emergency Alerts)

**If user reports ANY of these during onboarding, show immediate alert:**
## 9. Event Status States

Each event (vaccine, deworming, appointment, medication) can be:
## 10. Data Model - Minimal Schema

### User
## 11. API Endpoints (Suggested)

### Onboarding Flow
## 12. Onboarding Summary Screen (Final Output)

**Show user:**
## 13. Edge Cases & Handling

| Edge Case | Handling |
## 14. Validation Rules

### Field-Level Validations
## 15. Empty States & Error Messages

### Empty State: No Dogs Yet
## 16. Example JSON Responses

### Scenario 1: Puppy (4 months, with some vaccine history)
## 17. Success Criteria

### For Users (Tutores)
## 18. Glossary & Terms

| Term | Definition |
## Next Steps

1. **Create detailed plan.md** with phased implementation roadmap
## 1. Executive Summary

Milo Care needs a **warm, conversational onboarding flow** that allows dog owners (tutores) to register their dog and automatically generate a personalized preventive health calendar based on:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Importante: 
"Con la información cargada, Milo Care armó un calendario preventivo inicial 
para Milo. Como algunos datos dependen del criterio veterinario, te recomendamos validar este plan en la próxima consulta."

[Botón] ✅ Comenzar / Ir al Dashboard
[Botón] ↺ Completar datos faltantes
```
## 13. Edge Cases & Handling

| **User skips onboarding** | Allow partial entry; show dashboard with warnings; flag missing sections |

## 14. Validation Rules
## 15. Empty States & Error Messages

### Empty State: No Dogs Yet
```

---

## 13. Edge Cases & Handling

| Edge Case | Handling |
|-----------|----------|
| **Adopted dog, no history** | Mark "historial desconocido"; require vet validation; suggest microchip check |
| **Unknown age** | Use estimated age; mark calendar as "pending validation"; lower confidence |
| **Puppy < 6 weeks** | Alert: "Muy pequeño; consulta vet urgente"; skip some fields; focus on nutrition & safety |
| **Adult never vaccinated** | Mark "catch-up needed"; require vet consult; generate catch-up plan; mark pending validation |
| **Vaccine overdue** | Status = "vencido"; send reminder every 7 days; flag for urgent attention |
| **Traveling AR↔UY** | Flag rabies certificate validity in both countries; suggest document export |
| **No veterinarian** | Mark calendar as "pending validation"; suggest vet finder tool |
| **Severe vaccine reaction history** | Highlight in vet notes; suggest alternative schedules; require vet approval before auto-reminders |
| **Senior + multiple symptoms** | Generate emergency alert; require vet consult before finalizing calendar |
| **Raw diet** | Increase parasite monitoring frequency; add leptospira suggestion; include raw-diet vet notes |
| **Rural exposure** | Increase leptospira/Bordetella priority; suggest more frequent parasite checks |
| **Multiple vaccine records** | Deduplicate; detect conflicts; allow user to mark "reliable" source; others as "pending vet review" |
| **User skips onboarding** | Allow partial entry; show dashboard with warnings; flag missing sections |

---

## 14. Validation Rules

### Field-Level Validations

```
- name: required, max 50 chars, no special chars
- email: required, valid format, unique, max 255 chars
- phone: optional, valid format for country
- country: required, must be AR or UY
- birthDate: IF provided, must be <= today
- estimatedAge: IF provided, must match valid range
- weight: required, must be 1-100 kg
- breed: required, lookup against breed database
- size: required, must match breed guidelines
- microchipId: optional, valid 15-digit format if provided
- photoUrl: optional, valid image URL, max 10MB
```

### Business Logic Validations

```
- If birthDate + estimatedAge conflict, alert user
- If age > 7 years but owner says "never vaccinated", require vet override
- If red-flag symptom + age < 12 weeks, enforce emergency alert
- If no veterinarian + high-risk profile, suggest urgent vet consult
- If vaccine date > current age, flag as impossible/future vaccination
- If multiple vaccine records same type within 30 days, detect duplicate entry
```

---

## 15. Empty States & Error Messages

### Empty State: No Dogs Yet
```
🐶 ¡Bienvenido a Milo Care!

Aún no registraste ningún perro. Comenzá ahora con el onboarding 
para crear el primer perfil de salud.

[Botón] + Agregar mi primer perro
```

### Empty State: No Calendar Events
```
📅 Sin eventos sugeridos

Los recordatorios aparecerán cuando completes el perfil de tu perro 
y cargues información de vacunas y visitas veterinarias.

[Botón] Completar perfil
```

### Error: Age Conflict
```
⚠️ La fecha de nacimiento no coincide con la edad estimada

Verificá:
- Fecha de nacimiento: 15/03/2024
- Edad estimada: 6 meses

¿Cuál es correcta? Actualizá para continuar.
```

### Error: Red Flag Detected
```
🚨 ALERTA DE EMERGENCIA

Reportaste: {symptom}

Esta condición puede requerir atención veterinaria URGENTE. 
Milo Care no puede evaluarlo a distancia.

👉 Llamá a tu veterinaria o ve a guardia veterinaria 24hs
👉 Si es después de horario: llamá a emergencias

Solo continuá si ya consultaste veterinario.
[Botón] Continuar / [Botón] Contactos de emergencia
```

---

## 16. Example JSON Responses

### Scenario 1: Puppy (4 months, with some vaccine history)

```json
{
  "dog": {
    "id": "dog-123",
    "userId": "user-456",
    "name": "Milo",
    "birthDate": "2026-01-14",
    "estimatedAge": null,
    "birthDateConfidence": "exact",
    "sex": "male",
    "breed": "Labrador Retriever",
    "isCross": false,
    "size": "large",
    "neutered": false,
    "weightKg": 15,
    "lifeStage": "early_puppy",
    "riskProfile": "medium",
    "countryProfile": "AR"
  },
  "vaccineEvents": [
    {
      "id": "vax-001",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": "2026-02-18",
      "nextDueAt": "2026-03-18",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    },
    {
      "id": "vax-002",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": null,
      "nextDueAt": "2026-03-18",
      "status": "sugerido",
      "source": "suggested",
      "requiresVetValidation": false
    },
    {
      "id": "vax-003",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": null,
      "nextDueAt": "2026-04-14",
      "status": "sugerido",
      "source": "suggested",
      "requiresVetValidation": false
    }
  ],
  "appointments": [
    {
      "id": "apt-001",
      "type": "annual_checkup",
      "reason": "Chequeo de cachorro",
      "scheduledAt": null,
      "status": "sugerido"
    }
  ],
  "summary": {
    "nextVaccine": "Triple (booster) - 18/03/2026",
    "nextDeworming": "Revisar con veterinario",
    "nextCheckup": "Consulta inicial recomendada",
    "missingData": ["veterinarian"],
    "disclaimer": "Esta información es orientativa y no reemplaza la consulta..."
  }
}
```

### Scenario 2: Adult Without History (3 years old, adopted)

```json
{
  "dog": {
    "id": "dog-789",
    "userId": "user-456",
    "name": "Luna",
    "birthDate": "2023-01-15",
    "birthDateConfidence": "estimated",
    "sex": "female",
    "breed": "Mixed",
    "isCross": true,
    "size": "medium",
    "neutered": true,
    "weightKg": 22,
    "lifeStage": "adult",
    "riskProfile": "high",
    "countryProfile": "AR"
  },
  "vaccineEvents": [
    {
      "id": "vax-catch-up-001",
      "vaccineType": "Triple/Quádruple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    },
    {
      "id": "vax-catch-up-002",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    },
    {
      "id": "vax-catch-up-003",
      "vaccineType": "Leptospira",
      "antigens": ["leptospira"],
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "source": "suggested",
      "requiresVetValidation": true
    }
  ],
  "dewormingEvents": [
    {
      "id": "dew-001",
      "productName": "TBD (pending vet)",
      "parasiteType": "internal",
      "administeredAt": null,
      "nextDueAt": null,
      "status": "pending_vet_validation",
      "requiresVetValidation": true
    }
  ],
  "summary": {
    "status": "historial_incompleto",
    "alert": "No encontramos vacunas registradas. Para evitar errores, Milo Care tratará el calendario como incompleto...",
    "nextStep": "Consulta vet urgente para validar historial",
    "missingData": ["veterinarian", "complete_vaccine_history", "deworming_history"],
    "confidence": "LOW"
  }
}
```

### Scenario 3: Senior Dog (9 years, well-documented)

```json
{
  "dog": {
    "id": "dog-999",
    "userId": "user-456",
    "name": "Rex",
    "birthDate": "2017-05-10",
    "birthDateConfidence": "exact",
    "sex": "male",
    "breed": "German Shepherd",
    "isCross": false,
    "size": "large",
    "neutered": true,
    "weightKg": 32,
    "lifeStage": "senior",
    "riskProfile": "low",
    "countryProfile": "UY",
    "conditions": ["osteoarthritis"],
    "hasVeterinarian": true,
    "veterinarianName": "Dra. García, Clínica PetCare"
  },
  "vaccineEvents": [
    {
      "id": "vax-annual-001",
      "vaccineType": "Triple",
      "antigens": ["moquillo", "parvovirus", "adenovirus"],
      "administeredAt": "2025-05-20",
      "nextDueAt": "2026-05-20",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    },
    {
      "id": "vax-annual-002",
      "vaccineType": "Rabia",
      "antigens": ["rabia"],
      "administeredAt": "2025-06-15",
      "nextDueAt": "2026-06-15",
      "status": "completado",
      "source": "manual",
      "requiresVetValidation": false
    }
  ],
  "appointments": [
    {
      "id": "apt-senior-001",
      "type": "annual_checkup",
      "reason": "Chequeo preventivo anual",
      "scheduledAt": "2026-05-20",
      "status": "programado"
    },
    {
      "id": "apt-senior-002",
      "type": "annual_checkup",
      "reason": "Chequeo preventivo (semestral recomendado para senior)",
      "scheduledAt": null,
      "status": "sugerido"
    }
  ],
  "seniorMonitoring": {
    "weightCheckFrequency": "monthly",
    "mobilityAssessment": "pending",
    "bloodworkSuggestion": "annually or per vet",
    "supplementConsideration": "joint health, omega-3"
  },
  "summary": {
    "nextVaccine": "Triple - 20/05/2026",
    "nextRabies": "15/06/2026",
    "nextCheckup": "20/05/2026 (programado)",
    "monitoringPlan": "Semestral + peso mensual recomendado",
    "missingData": []
  }
}
```

---

## 17. Success Criteria

### For Users (Tutores)

✅ After onboarding completes, user understands:
- What data they entered and why
- What data is missing
- Which vaccines need revision
- When to consult veterinarian next
- What reminders are scheduled
- Difference between suggestions vs. real veterinarian instructions

### For System

✅ Dashboard shows:
- Next vaccine (with due date)
- Next deworming (with due date)
- Next checkup (with scheduling option)
- Active alerts/red flags
- Missing data sections
- "Add clinical event" button
- "Complete profile" button

✅ API responses:
- All calendar events with status and confidence
- Reminders correctly scheduled per rules
- Edge cases handled gracefully
- No contradictory suggestions

✅ Data Quality:
- No duplicate vaccine entries
- Dates validated against dog age
- Age classifications accurate
- Risk profile correctly calculated

---

## 18. Glossary & Terms

| Term | Definition |
|------|-----------|
| **Core vaccine** | Moquillo, parvo, adeno, rabia (essential) |
| **Antigen** | Active immune component (e.g., moquillo is an antigen) |
| **Titulo** | Blood test showing immunity level (alternative to auto-booster) |
| **Desparasitación** | Antiparasitic treatment (internal & external) |
| **Coproparasitario** | Stool test for internal parasites |
| **Cachorro** | Puppy |
| **Tutores** | Dog owners (used in AR/UY context) |
| **Libreta/Carnet** | Vaccination record booklet |
| **Ley local** | Local legal requirement (e.g., rabies mandate) |
| **Criterio veterinario** | Veterinarian professional judgment (overrides suggestions) |
| **Red flag** | Symptom requiring urgent veterinary attention |
| **Life stage** | Age-based classification (neonatal, puppy, adult, senior) |
| **Risk profile** | Low/medium/high based on lifestyle factors |

---

## Next Steps

1. **Create detailed plan.md** with phased implementation roadmap
2. **Generate user stories** and estimation (T-shirt sizing)
3. **Design frontend screens** with Figma wireframes
4. **Build data migration strategy** for existing users
5. **Create vet consultation guide** for integration with clinics
6. **Set up A/B testing** for calendar suggestions accuracy

