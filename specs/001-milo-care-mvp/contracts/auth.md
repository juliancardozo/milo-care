# API Contract: Authentication

**Base path**: `/api/auth`  
**Auth**: All endpoints in this file are **public** (no JWT required) unless noted.

---

## POST /api/auth/register

Register a new user account.

**Request**
```json
{
  "name": "Laura García",
  "email": "laura@example.com",
  "password": "Sup3rS3cure!"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | 1–100 characters |
| `email` | string | yes | Valid email format |
| `password` | string | yes | Minimum 8 characters |

**Response `201 Created`**
```json
{
  "user": {
    "id": "664a1b2c3d4e5f6789abcdef",
    "name": "Laura García",
    "email": "laura@example.com",
    "tier": "free"
  },
  "token": "<JWT>"
}
```

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already registered |

---

## POST /api/auth/login

Authenticate an existing user.

**Request**
```json
{
  "email": "laura@example.com",
  "password": "Sup3rS3cure!"
}
```

**Response `200 OK`**
```json
{
  "user": {
    "id": "664a1b2c3d4e5f6789abcdef",
    "name": "Laura García",
    "email": "laura@example.com",
    "tier": "free"
  },
  "token": "<JWT>"
}
```

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | Email not found or password incorrect (generic message — no enumeration) |

---

## POST /api/auth/forgot-password

Initiate password reset. Always returns 200 regardless of whether the email exists (prevents user enumeration).

**Request**
```json
{
  "email": "laura@example.com"
}
```

**Response `200 OK`**
```json
{
  "message": "If an account with this email exists, a reset link has been sent."
}
```

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid email |
| 429 | `RATE_LIMIT_EXCEEDED` | More than 3 reset requests in 1 hour for this email |

---

## POST /api/auth/reset-password

Complete password reset using the token from the reset email.

**Request**
```json
{
  "token": "<plaintext reset token from email URL>",
  "newPassword": "N3wP4ssw0rd!"
}
```

**Response `200 OK`**
```json
{
  "message": "Password reset successfully. Please log in with your new password."
}
```

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing fields or password < 8 characters |
| 400 | `INVALID_OR_EXPIRED_TOKEN` | Token not found, already used, or expired (>1 hour) |

---

## POST /api/auth/logout *(JWT required)*

Invalidate the current session. Client should discard the JWT.

**Headers**: `Authorization: Bearer <JWT>`

**Response `200 OK`**
```json
{
  "message": "Logged out successfully."
}
```

---

## PATCH /api/auth/me/notifications *(JWT required)*

Update notification preferences.

**Headers**: `Authorization: Bearer <JWT>`

**Request**
```json
{
  "enabled": true,
  "vaccinationWindowDays": 7,
  "appointmentWindowHours": 24
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `enabled` | boolean | no | Master on/off for all email reminders |
| `vaccinationWindowDays` | integer | no | 1–30 |
| `appointmentWindowHours` | integer | no | 1–168 |

**Response `200 OK`** — returns updated user object (same shape as register/login response).

---

## DELETE /api/auth/me *(JWT required)*

Permanently delete the user's account and all associated data (FR — GDPR compliance).

**Headers**: `Authorization: Bearer <JWT>`

**Request**
```json
{
  "confirmPassword": "Sup3rS3cure!"
}
```

**Response `200 OK`**
```json
{
  "message": "Account and all associated data have been permanently deleted."
}
```

**Error responses**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_CREDENTIALS` | Password confirmation does not match |
