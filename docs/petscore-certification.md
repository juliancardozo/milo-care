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

## Certificado + compartir con aseguradora — IMPLEMENTADO ✅

> ⚠️ **Requiere revisión legal antes de producción.** El código está, pero el encendido
> (compartir niveles con una aseguradora real) es una decisión de negocio/legal.

### `PetScoreCertificate` (snapshot inmutable) — `CertificateService`
`dogId`, `ownerUserId`, `scoreSnapshot`, `confidenceLevel`, `attestedItems[]`, `certifiedBy`,
`issuedAt`, `validUntil`, `status` (active|superseded|expired|revoked). Se **emite** solo si
hay al menos una atestación (no se certifica un perro `self`); nunca se reescribe — emitir
uno nuevo deja el anterior `superseded`. `getActive` lo expira al vencer.
- `POST /api/dogs/:dogId/certificate` (emite, 400 `NEEDS_VERIFICATION` si no hay atestación)
- `GET /api/dogs/:dogId/certificate` (vista del tutor, con score)

### Consentimiento granular — `Consent` + `ConsentService`
`scope`, `partnerId`, `grantedAt`, `revokedAt`, `expiresAt`, `status`. Revocable; cada
cambio escribe `AuditLog` (`consent_given` / `consent_revoked`).
- `POST` / `DELETE` / `GET /api/dogs/:dogId/consent`

### Compartir el NIVEL con el partner (con consentimiento)
- `POST /api/dogs/:dogId/certificate/share` → requiere cert vigente + consentimiento activo;
  dispara webhook `certificate.shared` y audita `certificate_shared_with_partner`.
- `GET /api/v1/pets/:id/certificate` (API key del partner) → 403 `NO_CONSENT` sin consentimiento.

La aseguradora recibe **solo** (`CertificateService.shareableView`):

```json
{ "confidenceLevel":"certified", "certifiedBy":"clinica-palermo",
  "attestedCount": 2, "issuedAt":"…", "validUntil":"2026-12-01", "status":"active" }
```

**Nunca** el score numérico ni dato clínico individual (qué vacuna, condición o síntoma).

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
