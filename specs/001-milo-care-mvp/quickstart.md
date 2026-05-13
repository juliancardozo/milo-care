# Quickstart: Milo Care MVP

**Branch**: `001-milo-care-mvp`  
**Stack**: Node.js 20 + Express 4 (backend) · React 18 + Vite (frontend) · MongoDB Atlas

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org or `nvm install 20` |
| npm | 10+ | Bundled with Node.js |
| MongoDB Atlas account | free tier | https://cloud.mongodb.com |
| Resend account | free tier | https://resend.com |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd milocura

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## 2. Configure Environment Variables

**Backend** — create `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/milocura?retryWrites=true&w=majority

# JWT
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@milocura.com

# App
APP_BASE_URL=http://localhost:5173
```

**Frontend** — create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 3. Start Development Servers

Open two terminal tabs:

```bash
# Tab 1 — Backend (runs on :3001)
cd backend && npm run dev

# Tab 2 — Frontend (runs on :5173)
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.

---

## 4. Run Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Frontend component tests
cd frontend && npm test
```

---

## 5. Project Structure

```
milocura/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, environment validation
│   │   ├── middleware/      # JWT auth, tier enforcement, error handler
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   └── services/        # EmailService, TierService, ReminderJob
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level views
│   │   ├── store/           # Redux Toolkit slices
│   │   └── services/        # API client
│   └── tests/
└── specs/001-milo-care-mvp/ # Feature planning artifacts
```

---

## 6. Key Conventions

- **Auth**: All protected endpoints require `Authorization: Bearer <JWT>` header.
- **Tier enforcement**: Dog profile creation checks `user.tier`. Free users are limited to 1 dog. Returns `403 TIER_LIMIT_EXCEEDED` on violation.
- **Reminder job**: Runs every 5 minutes. Queries records where `nextReminderAt <= now`. Dispatches emails via `EmailService`, then updates `nextReminderAt` (medications) or clears it (one-shot reminders).
- **Password reset tokens**: Stored hashed (bcrypt) in a separate `passwordResetTokens` collection with a 1-hour TTL. Plaintext token sent via email URL only.
- **Error format**: All API errors return `{ "error": { "code": "ERROR_CODE", "message": "Human-readable description" } }`.

---

## 7. API Base URLs

| Service | URL |
|---------|-----|
| Backend API | `http://localhost:3001/api` |
| Frontend | `http://localhost:5173` |

See `specs/001-milo-care-mvp/contracts/` for full REST API contracts.
