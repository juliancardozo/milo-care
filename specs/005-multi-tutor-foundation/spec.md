# Spec 005: Multi-tutor Foundation (Architecture First)

**Feature**: Multi-tutor access for a dog profile
**Status**: Draft
**Priority**: P1 (High architectural risk)
**Scope**: Backend domain, permissions, invite lifecycle, and migration plan. No UX redesign in this phase.

---

## 1. Executive Summary

Milo Care currently stores each dog inside one User document. This gives strong locality and simple reads, but it prevents authenticated sharing of the same dog across multiple user accounts.

This feature adds a safe, incremental architecture for multi-tutor access without a big-bang migration:

1. Keep dogs embedded in User for now.
2. Introduce an access control projection (`DogAccess`) that maps who can access which dog.
3. Centralize authorization decisions in one policy layer.
4. Add invitation lifecycle endpoints.
5. Roll out behind a feature flag.

---

## 2. Problem Statement

Today, sharing is implemented only as a public vet token link, which is not an authenticated co-tutor model.

Current limitations:
- A second authenticated user cannot manage the same dog as co-tutor.
- Permission granularity (viewer/editor/owner) does not exist.
- Invite acceptance and revocation flows do not exist.
- Endpoint authorization assumes dog ownership by a single user document.

---

## 3. Goals and Non-goals

### Goals
- Enable authenticated multi-user access to a dog profile.
- Support role-based permissions: `owner`, `editor`, `viewer`.
- Keep current endpoint contracts stable during foundation phase.
- Add deterministic invite lifecycle with audit fields.
- Minimize migration risk and rollback complexity.

### Non-goals (this phase)
- No UI redesign for team/household management.
- No full extraction of dog entities to a dedicated collection yet.
- No cross-tenant analytics redesign.

---

## 4. Domain Model Additions

### New collection: DogAccess

Represents membership and permissions for one user on one dog.

Fields:
- `dogId` (ObjectId): identifier of the embedded dog subdocument.
- `ownerUserId` (ObjectId): canonical owner account.
- `memberUserId` (ObjectId): user with access.
- `role` (enum): `owner` | `editor` | `viewer`.
- `status` (enum): `active` | `pending` | `revoked`.
- `inviteEmail` (string, lowercase, optional while pending).
- `inviteTokenHash` (string, optional while pending).
- `inviteExpiresAt` (Date, optional).
- `invitedByUserId` (ObjectId, optional).
- `acceptedAt` (Date, optional).
- `revokedAt` (Date, optional).
- `revokedByUserId` (ObjectId, optional).
- timestamps.

Constraints:
- Unique active membership per (`dogId`, `memberUserId`).
- At most one active `owner` per `dogId` in this phase.

---

## 5. Authorization Policy

Central policy function (single source of truth):

`resolveDogAccess({ actorUserId, dogId, action })`

Actions:
- `dog.read`: owner/editor/viewer
- `dog.write`: owner/editor
- `dog.share`: owner
- `dog.revoke`: owner
- `dog.delete`: owner

Behavior:
- If feature flag is off, fallback to current owner-only behavior.
- If flag is on, policy checks `DogAccess` first, then owner fallback for backward compatibility.

---

## 6. API Surface (Foundation)

New endpoints (backend only):

- `GET /api/dogs/:dogId/members`
  - List active and pending members.
- `POST /api/dogs/:dogId/members/invite`
  - Owner invites by email and role.
- `POST /api/dogs/:dogId/members/accept`
  - Authenticated user accepts invite token.
- `PATCH /api/dogs/:dogId/members/:memberUserId`
  - Owner updates role (`editor` <-> `viewer`).
- `DELETE /api/dogs/:dogId/members/:memberUserId`
  - Owner revokes access.

Compatibility requirement:
- Existing dog CRUD and health endpoints keep same request/response shapes.
- Only authorization gate changes under the hood.

---

## 7. Migration Strategy

### Phase A: Backfill projection
- For every existing dog, create one `DogAccess` row with:
  - `role=owner`, `status=active`, `memberUserId=ownerUserId`.

### Phase B: Dual-read authorization
- Keep owner-only fallback while `DogAccess` coverage is verified.

### Phase C: Strict policy mode
- Remove fallback once metrics show full and stable coverage.

Rollback:
- Disable feature flag and return to owner-only path.
- `DogAccess` records remain inert data.

---

## 8. Security Requirements

- Invite token must be random, single-use, and stored hashed.
- Invite token expiration default: 72h.
- Role escalation guarded to owner only.
- Revoked members lose access immediately.
- Every membership mutation logs actor and timestamp.

---

## 9. Observability and KPIs

Metrics:
- invite_created_total
- invite_accepted_total
- invite_expired_total
- member_revoked_total
- authz_denied_total by action
- policy_fallback_total (must trend to zero)

SLO guard:
- Policy resolution p95 < 20ms.

---

## 10. Acceptance Criteria

1. Owner can invite another registered user and assign `viewer` or `editor`.
2. Invited user can accept and access shared dog according to role.
3. Viewer cannot mutate dog data.
4. Editor can mutate dog health records but cannot manage members.
5. Revoked user loses access across all dog endpoints immediately.
6. With flag off, system behavior matches current production behavior.
