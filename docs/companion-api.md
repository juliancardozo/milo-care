# Companion API v1 + webhooks (Fase 4)

API para integraciones del partner. Todo detrás de `COMPANION_ENABLED`.

## Autenticación

Por **API key** del partner (se entrega una vez al crear el partner). Enviarla en
`X-API-Key: <key>` o `Authorization: Bearer <key>`. La key se guarda hasheada
(SHA-256) y resuelve el partner → **toda la API queda aislada por partner**.

## Endpoints

### `POST /api/v1/events`
El partner empuja un evento. Scoped a su partner.

```http
POST /api/v1/events
X-API-Key: mp_xxx
{ "type": "policy.updated", "payload": { "policyNumber": "X-1" } }
→ 201 { "id": "...", "received": true }
```

### `GET /api/v1/pets/:id`
Vista **read-only y consentida** del perro. **No** expone dato clínico individual
(ni vacunas, ni síntomas, ni historial). Si el perro no pertenece al partner → 404.

```json
{
  "id": "...", "name": "Luna", "breed": "Mestizo",
  "sponsorshipStatus": "sponsored", "active": true,
  "verification": { "level": "certified", "certifiedBy": "Clínica Palermo", "validUntil": "2026-12-01" },
  "policy": { "status": "active", "productName": "Plan Total" }
}
```

## Panel del partner (`partner_admin`)

Autenticado por JWT. Aislamiento estricto: un `partner_admin` solo accede a su
propio partner (otro `:id` → 403). Solo agregados, **cero PII clínica individual**.

- `GET /api/partners/:id/metrics?month=YYYY-MM` → `{ totalPets, activePets, adherenceRate, retentionRate, eventsByType }`
- `GET /api/partners/:id/billing?month=YYYY-MM` → factura del mes.

Frontend: `/partner` (rol `partner_admin`).

## Webhooks salientes

Configurados en `Partner.webhookUrl`. Entrega con reintentos + backoff
(`WebhookService`); el evento registra la entrega.

### `insurance_lead.created`
Disparado al crear un lead de seguro (`POST /api/dogs/:dogId/insurance-lead`).

```json
{
  "event": "insurance_lead.created",
  "leadId": "...", "dogId": "...", "dogName": "Luna",
  "intent": "wants_quote", "contact": { "email": "..." }, "createdAt": "..."
}
```
