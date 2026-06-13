# Implementation Plan: Multi-tutor Foundation

**Branch**: `005-multi-tutor-foundation` | **Date**: 2026-06-13 | **Spec**: `specs/005-multi-tutor-foundation/spec.md`
**Input**: Feature specification from `/specs/005-multi-tutor-foundation/spec.md`

## Summary

Implement an architecture-first multi-tutor foundation that adds permissioned shared access to dogs while preserving existing endpoint contracts and the current embedded dog data model. This plan intentionally delays UX redesign and full dog extraction to reduce delivery risk.

## Technical Context

**Language/Version**: Node.js 20, Express 4, Mongoose 8, React 18
**Storage**: MongoDB (User document with embedded dogs + new DogAccess collection)
**Testing**: Jest + Supertest (backend), integration tests for authorization matrix
**Target Platform**: Existing web stack (no client contract break)

## Architecture Decisions

1. Add `DogAccess` projection collection instead of migrating dog storage immediately.
2. Centralize authorization through one service/middleware.
3. Roll out with feature flag and owner fallback.
4. Add invitation lifecycle with hashed tokens and expiration.
5. Keep current API responses stable for dog data endpoints.

## Project Structure (new/updated)

```text
backend/
├── src/
│   ├── models/
│   │   └── DogAccess.js                     # new
│   ├── services/
│   │   ├── dogAccessPolicy.js               # new
│   │   └── dogMembershipService.js          # new
│   ├── middleware/
│   │   └── resolveDogAccess.js              # new
│   ├── routes/
│   │   ├── dogMembers.js                    # new
│   │   ├── dogs.js                          # update: policy integration
│   │   ├── vaccinations.js                  # update: policy integration
│   │   ├── medications.js                   # update: policy integration
│   │   ├── appointments.js                  # update: policy integration
│   │   └── symptoms.js                      # update: policy integration
│   └── config/
│       └── featureFlags.js                  # update: multiTutorEnabled
└── tests/
    ├── contract/
    │   └── dog-members-contract.test.js     # new
    └── integration/
        └── multi-tutor-authz.test.js        # new

specs/005-multi-tutor-foundation/
├── spec.md
├── plan.md
└── tasks.md
```

## Rollout Plan

### Stage 0 - Dark launch
- Deploy models + policy code behind `MULTI_TUTOR_ENABLED=false`.
- Run backfill script in dry-run.

### Stage 1 - Controlled enablement
- Enable for internal/dev cohort only.
- Monitor authz denial, fallback usage, and invite metrics.

### Stage 2 - Production enablement
- Enable globally when fallback usage stays near zero.
- Keep rollback switch for one release cycle.

## Risks and Mitigations

1. **Authorization drift across routes**
   - Mitigation: single policy service + route wrappers + authz matrix tests.

2. **Data consistency with embedded dog IDs**
   - Mitigation: deterministic dogId handling and backfill verification report.

3. **Partial migration states**
   - Mitigation: dual-read fallback and idempotent backfill.

4. **Invite abuse or privilege escalation**
   - Mitigation: hashed single-use tokens, strict owner-only member management.

## Definition of Done

1. New membership APIs pass contract tests.
2. Existing dog endpoints enforce role permissions correctly.
3. Backfill report shows complete owner coverage.
4. Feature flag off reproduces current behavior.
5. Observability dashboards include policy and invite metrics.
