# API Contract: Medications

**Base path**: `/api/dogs/:dogId/medications`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>`.

---

## GET /api/dogs/:dogId/medications

Retrieve all medication records for a dog.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `active` \| `completed` \| `all` | `all` | Filter by medication status |

**Response `200 OK`**
```json
{
  "medications": [
    {
      "id": "666c...",
      "medicationName": "Amoxicillin",
      "dosage": "250mg twice daily",
      "startDate": "2026-05-01",
      "endDate": "2026-05-14",
      "frequencyHours": 12,
      "nextReminderAt": "2026-05-13T20:00:00Z",
      "status": "active",
      "notes": "Prescribed for ear infection"
    }
  ]
}
```

---

## POST /api/dogs/:dogId/medications

Add a new medication.

**Request**
```json
{
  "medicationName": "Amoxicillin",
  "dosage": "250mg twice daily",
  "startDate": "2026-05-01",
  "endDate": "2026-05-14",
  "frequencyHours": 12,
  "notes": "Prescribed for ear infection"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `medicationName` | string | yes | 1–100 characters |
| `dosage` | string | yes | 1–200 characters |
| `startDate` | string (ISO 8601) | yes | Date of first dose |
| `endDate` | string (ISO 8601) | no | Must be ≥ `startDate` |
| `frequencyHours` | integer | yes | 1–168 (hours between doses) |
| `notes` | string | no | Max 1000 characters |

`nextReminderAt` is computed server-side as `startDate + frequencyHours`.

**Response `201 Created`** — returns created medication object.

---

## PATCH /api/dogs/:dogId/medications/:medicationId

Update a medication or mark it as completed.

**Request**
```json
{
  "status": "completed",
  "notes": "Course completed early — symptoms resolved"
}
```

Setting `status: "completed"` archives the medication (FR-010). Reminder job will skip completed medications.

**Response `200 OK`** — returns updated medication object.

---

## DELETE /api/dogs/:dogId/medications/:medicationId

Delete a medication record.

**Response `200 OK`**
```json
{
  "message": "Medication record deleted."
}
```
