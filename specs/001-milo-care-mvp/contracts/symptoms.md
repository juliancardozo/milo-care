# API Contract: Symptoms

**Base path**: `/api/dogs/:dogId/symptoms`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>`.

---

## GET /api/dogs/:dogId/symptoms

Retrieve all symptom entries for a dog, ordered by `dateObserved` descending (most recent first).

**Response `200 OK`**
```json
{
  "symptoms": [
    {
      "id": "668e...",
      "symptomType": "Vomiting",
      "description": "Vomited twice after morning meal. No blood.",
      "dateObserved": "2026-05-12",
      "resolved": false,
      "createdAt": "2026-05-12T09:15:00Z"
    }
  ]
}
```

---

## POST /api/dogs/:dogId/symptoms

Log a new symptom entry.

**Request**
```json
{
  "symptomType": "Vomiting",
  "description": "Vomited twice after morning meal. No blood.",
  "dateObserved": "2026-05-12"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `symptomType` | string | yes | 1–100 characters |
| `description` | string | yes | 1–2000 characters |
| `dateObserved` | string (ISO 8601) | yes | Must be ≤ today |

**Response `201 Created`** — returns created symptom object.

---

## PATCH /api/dogs/:dogId/symptoms/:symptomId

Update a symptom entry (e.g., mark as resolved).

**Request**
```json
{
  "resolved": true,
  "description": "Resolved after 24 hours. No recurrence."
}
```

**Response `200 OK`** — returns updated symptom object.

---

## DELETE /api/dogs/:dogId/symptoms/:symptomId

Delete a symptom entry.

**Response `200 OK`**
```json
{
  "message": "Symptom entry deleted."
}
```
