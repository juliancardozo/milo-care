# Research: Milo Care MVP

**Phase**: 0  
**Feature**: [plan.md](plan.md)  
**Date**: 2026-05-13

---

## 1. Architecture — Modular Monolith vs. Microservices

**Decision**: Modular Express monolith (single `backend/` codebase)

**Rationale**: The RFC proposed microservices, but for a 1,000-user MVP this introduces premature complexity with no benefit. Martin Fowler's guidance: "begin with a monolith, keep it modular, and split into microservices once the monolith becomes a problem." Microservices suit teams past product/market fit, typically 50k+ users.

**Alternatives Considered**:
- **Microservices (RFC proposal)**: Distributed debugging, inter-service communication, deployment overhead — rejected for MVP.
- **Serverless/FaaS**: Cold starts and latency unpredictability problematic for transactional health records — rejected.

**Key Implementation Notes**:
- Organize by feature domain (auth, dogs, health records), not by technical layer
- Keep service layer decoupled from HTTP handlers — makes future split easier
- Express Router modules enforce module boundaries without deployment complexity

---

## 2. Email Delivery — Resend (Primary), SendGrid (Fallback)

**Decision**: Resend for MVP email delivery

**Rationale**: Best developer experience for MVP; no warmup period required; React Email template integration; flat-rate pricing ($20/month base + $0.0001/email). Covers vaccination reminders, medication alerts, appointment reminders, and password reset emails.

**Alternatives Considered**:
- **AWS SES**: Cheapest long-term ($0.0001/email), but requires 2–3 week DNS warmup, dedicated IP management, and manual bounce/complaint handling — too much ops overhead for MVP.
- **SendGrid**: Proven reliability; $30/month base, 40k emails/month. Viable fallback if Resend proves insufficient.
- **Nodemailer + SMTP**: Zero infrastructure cost, but requires managing deliverability, bounces, and reputation independently — rejected for MVP.

**Key Implementation Notes**:
- Wrap Resend SDK in an `EmailService` abstraction to allow future provider swap without touching business logic
- Implement retry with exponential backoff for transient failures
- Register bounce/complaint webhooks to invalidate bad addresses
- Use test/sandbox mode in development and CI to avoid real sends

---

## 3. Password Reset — Cryptographic URL Token (Not JWT)

**Decision**: Secure random token stored hashed in DB, sent as URL query parameter

**Rationale**: OWASP-recommended pattern. JWTs cannot be server-side revoked and introduce risk of implementation mistakes. Cryptographic tokens are simple, auditable, and fully revocable.

**Flow**:
1. User requests reset → generate `crypto.randomBytes(32).toString('hex')` token
2. Hash token with bcrypt and store in DB alongside userId + 1-hour expiry
3. Email plaintext token as URL: `https://app.com/reset?token=<plaintext>`
4. User submits new password → verify token hash, check expiry, reset password, delete token, invalidate all active sessions

**Alternatives Considered**:
- **Pure JWT reset tokens**: Stateless but irrevocable; timing attack risk — rejected.
- **SMS PIN**: Higher security but adds SMS infrastructure and cost — deferred post-MVP.

**Key Implementation Notes**:
- Always return generic response: "If an account with this email exists, a reset link has been sent" (prevents user enumeration)
- Rate-limit reset requests: max 3 per hour per email address
- Require HTTPS only; set `Referrer-Policy: no-referrer` on reset form
- Never auto-login after password reset; require explicit login
- Invalidate ALL active JWT sessions for the user on successful reset

---

## 4. MongoDB Schema — Embedded Documents

**Decision**: Embed health records within the dog document; embed dogs within the user document

**Rationale**: MongoDB principle: "data accessed together should be stored together." Typical queries fetch a user's dog + its health records in one request. Referenced collections would require multiple round-trips. With MVP scale (< 10k users), document sizes will stay well below MongoDB's 16MB document limit.

**Recommended structure**:

```
User document
├── _id, email, passwordHash, name, tier (free|premium), createdAt, updatedAt
└── dogs[] (embedded)
    ├── _id, name, breed, dateOfBirth, photoUrl
    ├── vaccinations[]   ← embedded health records
    ├── medications[]
    ├── appointments[]
    └── symptoms[]
```

Health record collections grow linearly per dog. At MVP scale (< 5 years of records per dog), embedded arrays are performant and simple.

**Alternatives Considered**:
- **Fully referenced (separate collections)**: Slower (multiple queries), more complex aggregations — justified only past ~50k users or if record counts exceed thousands per dog.
- **Partially embedded (dogs referenced, records embedded)**: Middle-ground, but premature for MVP scale.

**Key Implementation Notes**:
- Index on `_id` (default) and compound index on `dogs._id` for dog-level queries
- Use MongoDB `$push`/`$pull` array operators for record insert/delete
- Validate all document shapes with Mongoose schemas (no schema-less writes)
- Monitor document size for high-frequency users; add migration path to referenced collections if needed post-MVP

---

## 5. Freemium Tier Enforcement — Service Layer Pattern

**Decision**: Enforce tier limits in the service layer, not in middleware

**Rationale**: Service layer enforcement is testable (mock service, not middleware), reusable (background jobs and future CLI tools call same service), and handles complex logic (counting docs, checking tier, returning typed errors). Middleware handles only authentication.

**Pattern**:
```
authMiddleware (req.user populated)
    → route handler
        → service.addDog(userId, data)
            → check user.tier + dog count
            → throw TierLimitError if exceeded
        → route handler converts TierLimitError → HTTP 403 with descriptive message
```

**Alternatives Considered**:
- **Middleware-only enforcement**: Hard to test, duplicates logic for multiple routes — rejected.
- **Database-level constraints**: MongoDB doesn't natively enforce application-level business rules — not applicable.

**Key Implementation Notes**:
- Define a typed `TierLimitError` class (extends Error) with a `code: 'TIER_LIMIT_EXCEEDED'` property
- Central error-handling middleware in Express converts domain errors to appropriate HTTP responses
- Premium tier check should be a single shared utility: `canAddDog(user, currentCount)` — no inline logic in routes
- Future tiers can be added by extending the utility without touching route handlers
