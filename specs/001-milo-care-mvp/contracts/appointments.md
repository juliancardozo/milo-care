# API Contract: Appointments

**Base path**: `/api/dogs/:dogId/appointments`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>`.

---

## GET /api/dogs/:dogId/appointments

Retrieve all veterinary appointments for a dog, ordered by `appointmentDate` ascending.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `upcoming` \| `completed` \| `cancelled` \| `all` | `all` | Filter by status |

**Response `200 OK`**
```json
{
  "appointments": [
    {
      "id": "667d...",
      "clinicName": "Clínica Veterinaria Central",
      "appointmentDate": "2026-05-20T10:00:00Z",
      "reminderAt": "2026-05-19T10:00:00Z",
      "status": "upcoming",
      "notes": "Annual checkup"
    }
  ]
}
```

---

## POST /api/dogs/:dogId/appointments

Schedule a new veterinary appointment.

**Request**
```json
{
  "clinicName": "Clínica Veterinaria Central",
  "appointmentDate": "2026-05-20T10:00:00Z",
  "notes": "Annual checkup"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `clinicName` | string | yes | 1–200 characters |
| `appointmentDate` | string (ISO 8601) | yes | Must be in the future |
| `notes` | string | no | Max 1000 characters |

`reminderAt` is computed server-side as `appointmentDate - user.notificationPreferences.appointmentWindowHours`.

**Response `201 Created`** — returns created appointment object.

---

## PATCH /api/dogs/:dogId/appointments/:appointmentId

Update or cancel an appointment.

**Request**
```json
{
  "appointmentDate": "2026-05-22T14:00:00Z",
  "clinicName": "Clínica Norte",
  "status": "cancelled",
  "notes": "Rescheduled"
}
```

When `status` is set to `cancelled`, the `reminderAt` field is cleared server-side and any pending reminder is cancelled (FR-013).  
When `appointmentDate` is updated, `reminderAt` is recomputed automatically.

**Response `200 OK`** — returns updated appointment object.

---

## DELETE /api/dogs/:dogId/appointments/:appointmentId

Delete an appointment record.

**Response `200 OK`**
```json
{
  "message": "Appointment deleted."
}
```
