# Tasks: Feature 005 - Multi-tutor Foundation

**Source docs**: `specs/005-multi-tutor-foundation/spec.md`, `specs/005-multi-tutor-foundation/plan.md`

## Epic Map

| Epic ID | Name | Outcome |
|---|---|---|
| EPIC-005-001 | Domain and Policy Foundation | `DogAccess` model + centralized authz policy |
| EPIC-005-002 | Membership API | Invite, accept, list, role update, revoke |
| EPIC-005-003 | Endpoint Integration | Existing dog endpoints enforced by role |
| EPIC-005-004 | Migration and Rollout | Backfill, feature flag rollout, observability |

## EPIC-005-001 - Domain and Policy Foundation

- [ ] T001 Add `DogAccess` mongoose model with indexes and lifecycle fields.
  - Files: `backend/src/models/DogAccess.js`
  - Tests: model index validation + status transitions.

- [ ] T002 Add `multiTutorEnabled` flag in feature config.
  - Files: `backend/src/config/featureFlags.js`, `backend/.env.example`, `render.yaml`
  - Tests: flag parsing true/false behavior.

- [ ] T003 Implement policy engine `resolveDogAccess(actorUserId, dogId, action)`.
  - Files: `backend/src/services/dogAccessPolicy.js`
  - Tests: matrix for owner/editor/viewer/pending/revoked.

- [ ] T004 Implement middleware adapter for routes.
  - Files: `backend/src/middleware/resolveDogAccess.js`
  - Tests: middleware returns 403/404/200 correctly.

## EPIC-005-002 - Membership API

- [ ] T005 Add members route file and mount routes.
  - Files: `backend/src/routes/dogMembers.js`, `backend/src/app.js`
  - Tests: route registration smoke test.

- [ ] T006 Implement `GET /api/dogs/:dogId/members`.
  - Files: `backend/src/routes/dogMembers.js`
  - Tests: owner sees active + pending list.

- [ ] T007 Implement `POST /api/dogs/:dogId/members/invite` with hashed token and TTL.
  - Files: `backend/src/routes/dogMembers.js`, `backend/src/services/dogMembershipService.js`
  - Tests: invite created, duplicate handling, invalid role rejected.

- [ ] T008 Implement `POST /api/dogs/:dogId/members/accept`.
  - Files: `backend/src/routes/dogMembers.js`, `backend/src/services/dogMembershipService.js`
  - Tests: token accept success, expired token, reused token.

- [ ] T009 Implement `PATCH /api/dogs/:dogId/members/:memberUserId` role updates.
  - Files: `backend/src/routes/dogMembers.js`
  - Tests: owner can update viewer/editor, non-owner forbidden.

- [ ] T010 Implement `DELETE /api/dogs/:dogId/members/:memberUserId` revoke flow.
  - Files: `backend/src/routes/dogMembers.js`
  - Tests: revoked member loses access.

## EPIC-005-003 - Endpoint Integration

- [ ] T011 Wire policy checks into existing dog read routes.
  - Files: `backend/src/routes/dogs.js`, `backend/src/routes/calendar.js`, `backend/src/routes/events.js`
  - Tests: viewer read allowed.

- [ ] T012 Wire policy checks into write routes.
  - Files: `backend/src/routes/vaccinations.js`, `backend/src/routes/medications.js`, `backend/src/routes/appointments.js`, `backend/src/routes/symptoms.js`
  - Tests: viewer denied writes, editor allowed writes.

- [ ] T013 Guard member management actions as owner-only.
  - Files: `backend/src/routes/dogMembers.js`
  - Tests: editor/viewer forbidden.

- [ ] T014 Add integration test suite for full authz matrix.
  - Files: `backend/tests/integration/multi-tutor-authz.test.js`
  - Tests: owner/editor/viewer/revoked/pending across representative endpoints.

## EPIC-005-004 - Migration and Rollout

- [ ] T015 Create idempotent backfill script for owner membership rows.
  - Files: `backend/scripts/backfillDogAccessOwners.js`
  - Tests: dry-run report + idempotency rerun.

- [ ] T016 Add metrics/logging for invite and policy decisions.
  - Files: `backend/src/services/dogAccessPolicy.js`, `backend/src/services/dogMembershipService.js`
  - Tests: metric counters increment on key actions.

- [ ] T017 Add contract tests for membership APIs.
  - Files: `backend/tests/contract/dog-members-contract.test.js`
  - Tests: success + permission + validation paths.

- [ ] T018 Add rollout and rollback runbook.
  - Files: `docs/release-notes/005-multi-tutor-foundation.md`
  - Tests: manual checklist completed in dev.

## Suggested Execution Order

1. T001-T004
2. T005-T010
3. T011-T014
4. T015-T018

## Exit Criteria

- All tasks complete with passing tests.
- `MULTI_TUTOR_ENABLED=false` retains legacy behavior.
- `MULTI_TUTOR_ENABLED=true` enforces role matrix consistently.
- Backfill coverage report is complete and auditable.
