# Pet Score certificado — diseño y estado

> **Encuadre regulatorio.** El "Pet Score" está marcado como No-goal en el master prompt
> por riesgo regulatorio/reputacional (venta de datos, pricing actuarial). Este documento
> implementa **solo el escalón seguro** y deja el resto **diseñado, no construido**.

## Decisiones tomadas

1. **El Pet Score NO es un número nuevo.** Es el `healthScore` existente (engagement,
   0–100) **con un sello de confianza encima**. El sello es metadata; nunca cambia el número.
2. **Atestaciones discretas + nivel de confianza** (no se certifica el número). Un vet
   atesta hechos clínicos verificables (una vacuna, una desparasitación), y de esas
   atestaciones se deriva el nivel del sello.
3. Niveles del sello (`services/petScoreVerification.deriveVerification`):
   - **`self`** — sin atestaciones activas (auto-reportado; estado por defecto).
   - **`verified`** — un vet validó vía link compartido, sin clínica identificada.
   - **`certified`** — vet logueado con clínica identificada → "Certificado por [clínica]".

## Implementado (escalón seguro) ✅

- **`AuditLog`** (`models/AuditLog.js`) + **`AuditService`** — registro append-only de
  consentimiento y atestaciones (base legal Ley 25.326 AR / 18.331 UY, GDPR).
- **`VetAttestation`** (`models/VetAttestation.js`) — atestación discreta por (perro, ítem),
  con identidad opcional de vet/clínica y vigencia (`expiresAt`, atada al refuerzo del ítem).
- **Flujo de atestación** (núcleo compartido en `services/AttestationService`):
  - **Por link** (`POST /api/vet/:token/validate`, `optionalAuth`): vet logueado →
    `certified`; anónimo → `verified`.
  - **Desde el panel autenticado** (`POST /api/vet-portal/dogs/:dogId/attest`,
    `requireVet`): el vet certifica pacientes de **su** cohorte (aislamiento por
    `acquisitionClinicId`; perro de otra clínica → 403). `GET /api/vet-portal/patients`
    lista los carnets atestables. UI: sección "Certificar carnets" en el panel del vet.
  - Ambos caminos setean `vetValidatedAt`, crean/refrescan `VetAttestation` + `AuditLog`.
  - generar/revocar el link de expediente registra `consent_given` / `consent_revoked`.
- **Sello en el Health Score** (`GET /api/dogs/:dogId/health-score`) detrás de
  `featureFlags.vetSealEnabled` (default on): agrega `verification` sin tocar `score`.
- **Frontend**: badge "Verificado por veterinario" / "Certificado por [clínica]" en
  `HealthScoreCard`.

## Diseñado, NO construido (deferido) 🔒

Requiere decisión de negocio + revisión legal antes de tocar código.

### `PetScoreCertificate` (snapshot inmutable)
`dogId`, `scoreSnapshot` (copia, no live), `confidenceLevel`, `attestationRefs[]`,
`issuedAt`, `validUntil`, `status`, `revocationReason`. Se **emite** cuando hay un set
mínimo de atestaciones activas; nunca se reescribe (se emite uno nuevo). Un job recalcula
vigencia y lo degrada/expira cuando una atestación vence o se revoca.

### Consentimiento granular por destino + compartir con aseguradora
`Consent` (scope, `partnerId`, `grantedAt`, `revokedAt`, `expiresAt`), revocable, cada
cambio escribe `AuditLog`. Recién con consentimiento explícito el partner recibe —vía la
API v1 / webhook de Fase 4— **solo**:

```json
{ "dogId":"…", "confidenceLevel":"certified", "validUntil":"2026-12-01",
  "attestedItems":["vaccines_up_to_date"], "issuedByClinic":"clinica-palermo" }
```

**Nunca** dato clínico individual (qué vacuna, qué condición, qué síntoma).

## Guardrails no negociables

- No es diagnóstico ni pricing actuarial propio: atestamos hechos; la decisión de
  prima/cobertura es de la aseguradora, con intervención humana.
- No se vende dato clínico individual; el partner solo ve nivel + vigencia.
- Consentimiento granular, revocable y registrado en `AuditLog`.
- Matrícula del vet verificable; atestaciones inmutables salvo `status`.

## Fasing sugerido

- **Ahora (hecho):** `AuditLog` + atestaciones + sello. Sello como valor B2C/vet.
- **Fase 5.1:** `PetScoreCertificate` + consentimiento por partner + compartir nivel.
- **Fase 5.2 (con legal):** descuentos/carencias reales con una aseguradora piloto.
