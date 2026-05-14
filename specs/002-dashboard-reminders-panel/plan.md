## Implementation Plan: Dashboard Upcoming Reminders Panel (AR/UY Clinical Context)

**Branch**: `001-milo-care-mvp` | **Date**: 2026-05-14 | **Spec**: `specs/002-dashboard-reminders-panel/spec.md`
**Input**: Feature specification from `/specs/002-dashboard-reminders-panel/spec.md`

## Summary

Implement an upcoming reminders panel that aggregates vaccinations, medications, and appointments across dogs, supports click-through and dismissal, and adds regional clinical guidance for Argentina and Uruguay.

The implementation will remain a read/action support tool, not a diagnostic or prescribing engine. All clinical guidance shown in UX and notifications must include an explicit recommendation to consult a trusted veterinarian.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 backend, React 18 frontend)  
**Primary Dependencies**: Express 4, Mongoose 8, React Router 6, Redux Toolkit, Axios, Resend, node-cron  
**Storage**: MongoDB (local Docker in dev; Atlas-compatible URI)  
**Testing**: Jest + Supertest (backend), Vitest + Testing Library (frontend), manual E2E quickstart validation  
**Target Platform**: Web app (desktop/mobile browser), timezone-aware for AR/UY users  
**Project Type**: Web application (frontend + backend API)  
**Performance Goals**: dashboard reminder panel visible in <= 2s (SC-001); reminder projection staleness <= 1 minute (SC-005)  
**Constraints**: no autonomous diagnosis/prescription; antibiotics recorded from veterinarian prescription only; bilingual support (ES priority); overdue reminders surfaced  
**Scale/Scope**: MVP scope for up to 1k active users, multi-dog households, max 5 reminders in panel plus "view all"

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`/ .specify/memory/constitution.md` is still a blank template with no enforceable principles.

Gate status before Phase 0: **PASS (N/A)**

Working guardrails applied for this feature:

- Clinical content is educational and reminder-oriented only.
- UI and reminder copy must include "consult your trusted veterinarian" guidance.
- Medication defaults are constrained to safe recording patterns; no autonomous antibiotic dosing recommendations.
- Country profile support for AR/UY must be configurable and overrideable by veterinarian instruction.

## Project Structure

### Documentation (this feature)

```text
specs/002-dashboard-reminders-panel/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   ├── config/
│   ├── middleware/
│   ├── services/
│   └── routes/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: Keep existing web-app structure. Implement reminder aggregation and dismissal in backend routes/services and consume via dashboard page in frontend.

## Phase 0 Research Resolution

All `NEEDS CLARIFICATION` items in this plan were resolved using existing repository context and provided domain brief.

Key technical decisions and alternatives are recorded in:

- `specs/002-dashboard-reminders-panel/research.md`

## Phase 1 Design Output

Design artifacts created:

- `specs/002-dashboard-reminders-panel/data-model.md`
- `specs/002-dashboard-reminders-panel/contracts/reminders-api.yaml`
- `specs/002-dashboard-reminders-panel/quickstart.md`

Agent context update completed by updating the SPECKIT plan reference in:

- `.github/copilot-instructions.md`

## Post-Design Constitution Check

Constitution remains undefined (template only), so formal gate remains N/A.

Design-time safety checks status:

- Clinical disclaimer requirement: **PASS**
- AR/UY country profile support: **PASS**
- Reminder logic remains non-diagnostic: **PASS**
- Antibiotic handling as prescribed-record only: **PASS**

## Complexity Tracking

No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
