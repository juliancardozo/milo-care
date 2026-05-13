# API Contract: Vaccinations

**Base path**: `/api/dogs/:dogId/vaccinations`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>`.

---

## GET /api/dogs/:dogId/vaccinations

Retrieve all vaccination records for a dog, ordered by `dateAdministered` ascending.

**Response `200 OK`**
```json
{
  "vaccinations": [
    {
      "id": "665b...",
      "vaccineName": "Rabies",
      "dateAdministered": "2024-01-10",
      "nextDueDate": "2025-01-10",
      "veterinarian": "Dr. Martínez",
      "notes": "Annual booster",
      "status": "upcoming"
    }
  ]
}
```

`status` is computed: `upcoming` if `nextDueDate > today`, `overdue` if `nextDueDate < today` and no newer record for same `vaccineName`, `no-reminder` if `nextDueDate` not set.

---

## POST /api/dogs/:dogId/vaccinations

Log a new vaccination record.

**Request**
```json
{
  "vaccineName": "Rabies",
  "dateAdministered": "2024-01-10",
  "nextDueDate": "2025-01-10",
  "veterinarian": "Dr. Martínez",
  "notes": "Annual booster"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `vaccineName` | string | yes | 1–100 characters |
| `dateAdministered` | string (ISO 8601) | yes | Must be ≤ today |
| `nextDueDate` | string (ISO 8601) | no | Must be > `dateAdministered` |
| `veterinarian` | string | no | Max 100 characters |
| `notes` | string | no | Max 1000 characters |

**Duplicate detection**: If a record with the same `vaccineName` and `dateAdministered` already exists, the response includes a `warning` field (does not block the save, per FR-007).

**Response `201 Created`**
```json
{
  "vaccination": { /* created record */ },
  "warning": "A vaccination record for 'Rabies' on 2024-01-10 already exists."
}
```
(`warning` is omitted if no duplicate detected.)

---

## PATCH /api/dogs/:dogId/vaccinations/:vaccinationId

Update a vaccination record.

**Request** — all fields optional.
```json
{
  "nextDueDate": "2026-01-10",
  "notes": "Updated notes"
}
```

**Response `200 OK`** — returns updated vaccination object.

---

## DELETE /api/dogs/:dogId/vaccinations/:vaccinationId

Delete a vaccination record.

**Response `200 OK`**
```json
{
  "message": "Vaccination record deleted."
}
```
