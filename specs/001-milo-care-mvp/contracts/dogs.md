# API Contract: Dog Profiles

**Base path**: `/api/dogs`  
**Auth**: All endpoints require `Authorization: Bearer <JWT>`.

---

## GET /api/dogs

Retrieve all dog profiles for the authenticated user.

**Response `200 OK`**
```json
{
  "dogs": [
    {
      "id": "664a...",
      "name": "Max",
      "breed": "Golden Retriever",
      "dateOfBirth": "2020-03-15",
      "photoUrl": "https://cdn.milocura.com/dogs/664a....jpg",
      "ageYears": 6
    }
  ]
}
```

---

## POST /api/dogs

Create a new dog profile.

**Free tier**: Limited to 1 dog. Returns `403 TIER_LIMIT_EXCEEDED` if user already has 1 dog and tier is `free`.

**Request**
```json
{
  "name": "Max",
  "breed": "Golden Retriever",
  "dateOfBirth": "2020-03-15",
  "photoUrl": "https://cdn.milocura.com/dogs/664a....jpg"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | 1–100 characters |
| `breed` | string | yes | 1–100 characters |
| `dateOfBirth` | string (ISO 8601) | yes | Must be in the past; max 30 years ago |
| `photoUrl` | string | no | Valid URL |

**Response `201 Created`** — returns the created dog object (same shape as GET item).

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 403 | `TIER_LIMIT_EXCEEDED` | Free tier already has 1 dog |

---

## GET /api/dogs/:dogId

Retrieve a specific dog profile.

**Response `200 OK`** — returns single dog object.

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `DOG_NOT_FOUND` | Dog does not exist or does not belong to the user |

---

## PATCH /api/dogs/:dogId

Update a dog profile.

**Request** — all fields optional; only provided fields are updated.
```json
{
  "name": "Maxwell",
  "breed": "Golden Retriever",
  "dateOfBirth": "2020-03-15",
  "photoUrl": "https://cdn.milocura.com/dogs/new.jpg"
}
```

**Response `200 OK`** — returns updated dog object.

---

## DELETE /api/dogs/:dogId

Delete a dog profile and all associated health records.

**Response `200 OK`**
```json
{
  "message": "Dog profile and all associated records deleted."
}
```
