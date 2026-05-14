# Research: Dashboard Reminders Panel with AR/UY Clinical Context

## 1) Reminder panel projection model

- Decision: Build reminders panel as a projection aggregated from vaccinations, medications, and appointments, rather than persisting a separate dashboard table.
- Rationale: Existing backend already stores source-of-truth records and runs a reminder job; projection avoids duplication and consistency drift.
- Alternatives considered: Persisted `dashboard_reminders` collection. Rejected because it increases synchronization complexity and stale-state risk.

## 2) Dismissal behavior

- Decision: Implement dismissal as a separate dismissal state tied to a logical reminder key (`pet + source type + source id + due date`) without deleting source records.
- Rationale: Matches FR-008/FR-009 and preserves clinical timeline integrity.
- Alternatives considered: Hard-deleting reminder source entries. Rejected because it destroys medical history.

## 3) Country-aware clinical templates (Argentina/Uruguay)

- Decision: Add country profile support (`AR`, `UY`) and risk profile flags to shape defaults for vaccine/desparasitacion guidance copy and reminder timing.
- Rationale: Product targets AR/UY and must provide region-appropriate defaults while allowing veterinarian override.
- Alternatives considered: Single global template. Rejected because regional legal and epidemiological contexts differ.

## 4) Veterinary safety positioning

- Decision: Clinical guidance in UI and notifications is informational only and always includes recommendation to consult a trusted veterinarian.
- Rationale: Reduces clinical/legal risk and aligns with safe MVP scope.
- Alternatives considered: Automated treatment recommendations. Rejected due to patient safety and legal exposure.

## 5) Medication strategy for MVP

- Decision: Medication module will support structured recording of veterinarian-prescribed courses. Antibiotics are record-and-remind only; no autonomous dosing suggestions.
- Rationale: Prescriptions vary by diagnosis and patient factors; the app should assist adherence, not prescribe.
- Alternatives considered: Auto-dosing all common medications. Rejected due to risk of misuse and unsafe generalization.

## 6) Reminder staleness target

- Decision: Keep reminder freshness target at <= 1 minute from source updates (SC-005), using query-time aggregation plus near-real-time recalculation hooks after create/update operations.
- Rationale: Meets spec target and avoids introducing heavy event infrastructure in MVP.
- Alternatives considered: Nightly batch-only recalculation. Rejected because it fails SC-005.

## 7) Notification channel strategy

- Decision: Keep email as base channel and design contracts to be channel-extensible (future push/WhatsApp).
- Rationale: Existing implementation already uses Resend; fastest path to reliable delivery.
- Alternatives considered: Add push in same feature. Rejected due to MVP speed and scope control.

## 8) UX language and localization

- Decision: Maintain Spanish-first bilingual UX with localized veterinary wording in reminder cards and empty states for AR/UY users.
- Rationale: Product audience and current app language direction are Spanish-first.
- Alternatives considered: English-only clinical terminology. Rejected due to reduced usability for target market.