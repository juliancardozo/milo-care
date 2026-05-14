# Implementation Plan: Full-List and Look-Ahead Precedence Clarification

**Branch**: `003-clarify-fr011-precedence` | **Date**: 2026-05-14 | **Spec**: `specs/003-clarify-fr011-precedence/spec.md`
**Input**: Feature specification from `/specs/003-clarify-fr011-precedence/spec.md`

## Summary

Clarify and implement two feature gaps blocking dashboard reminders panel completion:

1. **FR-011 Full-List Behavior**: "View all" navigation opens complete reminders list (single response, no pagination), not limited to top 5.
2. **Look-Ahead Precedence**: Explicit rules for window resolution (current-view value → user preference → 7-day default), temporal measurement from UTC now, and deterministic ordering (due date asc, then type order, then record ID).

This feature removes ambiguity and enables testing/release of reminders panel with predictable, deterministic behavior.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 backend, React 18 frontend)  
**Primary Dependencies**: Express 4, Mongoose 8, React Router 6, Redux Toolkit, Axios  
**Storage**: MongoDB (local Docker in dev; Atlas-compatible URI)  
**Testing**: Jest + Supertest (backend), Vitest + Testing Library (frontend), manual E2E  
**Target Platform**: Web app (desktop/mobile browser), timezone-aware for AR/UY users  
**Project Type**: Web application (frontend + backend API)  
**Performance Goals**: Full-list loads <= 2s (inherit from parent SC-001); window resolution deterministic  
**Constraints**: No autonomous diagnosis; follow existing reminder safety practices; clarification only (no redesign)  
**Scale/Scope**: Build on existing 002 feature; focus scope: full-list routing, precedence rules, deterministic ordering

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is still a placeholder template with no enforceable principles.

Gate status: **PASS (N/A)**

Working guardrails applied for this feature:
- Clarification scope remains narrowly bounded to full-list and precedence; no redesign of existing reminder features.
- Existing reminder safety constraints (non-diagnostic guidance, veterinarian consultation recommendation) preserved.
- All ordered-list outputs remain deterministic and testable.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)

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

**Structure Decision**: Extend existing web-app structure (002 feature). Implement full-list route/service in backend and consume via new frontend route/page. Reuse existing reminder projection and filtering patterns.

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
Phase 0 Research Resolution

All clarifications have been resolved in the specification. Five targeted questions were answered to eliminate ambiguity:

1. Full-list delivery model: single response, no pagination ✓
2. Invalid window fallback: ignore invalid, use 7-day default ✓
3. Full-list sort order: by due date ascending (matches dashboard) ✓
4. Simultaneous-date ordering: by type order, then record ID ✓
5. Temporal reference: from current UTC now ✓

Key decisions recorded in: `specs/003-clarify-fr011-precedence/spec.md` (Clarifications section)

## Phase 1 Design Output

This is a clarification feature (specification scope), not a full feature build. Design artifacts to generate:

- `research.md`: Validate no further unknowns remain
- `data-model.md`: Document look-ahead window source resolution model and eligible reminder set computation
- `contracts/`: Define full-list API endpoint and response schema
- `quickstart.md`: Manual test steps for full-list and precedence behavior

Agent context update completed: `.github/copilot-instructions.md` already references active spec path.

## Post-Design Constitution Check

Constitution remains template-only (N/A gate).

Design-time safety checks status:
- Clarification scope remains bounded: **PASS**
- Existing reminder safety preserved: **PASS**
- Deterministic behavior achieved: **PASS**

## Complexity Tracking

No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A