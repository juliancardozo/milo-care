# Implementation Plan: Milo Care MVP — Dog Health Management Platform

**Branch**: `001-milo-care-mvp` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-milo-care-mvp/spec.md`

## Summary

Milo Care is a web-based SaaS MVP enabling dog owners to track vaccinations, medications, veterinary appointments, and symptoms from a single health dashboard. The platform uses a React frontend, a Node.js/Express backend, and MongoDB for storage. Email is the sole notification channel. A freemium model gates free tier users to 1 dog profile; premium unlocks unlimited profiles. Authentication uses JWT with email-based password reset.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)  
**Primary Dependencies**: Express.js 4, Mongoose 8, React 18, React Router 6, Redux Toolkit, jsonwebtoken, AWS SES (email), bcrypt  
**Storage**: MongoDB via MongoDB Atlas (free tier for MVP)  
**Testing**: Jest + Supertest (backend API tests), Vitest + React Testing Library (frontend)  
**Target Platform**: Web — modern evergreen browsers; mobile-responsive; no native apps in MVP  
**Project Type**: Web application — React SPA + REST API (Express monolith)  
**Performance Goals**: API p95 response < 300ms; dashboard initial load < 2s on broadband  
**Constraints**: Email delivery 90% within 5 minutes (SC-008); free tier max 1 dog profile (FR-020); GDPR account deletion required; no offline write support in MVP  
**Scale/Scope**: Target 1,000 active users within 3 months; single-region AWS deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project constitution has been established yet — `constitution.md` contains only a blank template. No architectural gates apply at this time. Establishing a constitution is recommended before implementation begins to govern future decisions.

## Project Structure

### Documentation (this feature)

```text
specs/001-milo-care-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth.md
│   ├── dogs.md
│   ├── vaccinations.md
│   ├── medications.md
│   ├── appointments.md
│   └── symptoms.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── config/            # Environment & DB connection setup
│   ├── middleware/         # JWT auth, tier enforcement, error handling
│   ├── models/             # Mongoose schemas: User, Dog, Vaccination, Medication, Appointment, Symptom, Notification
│   ├── routes/             # Express route handlers: auth, dogs, vaccinations, medications, appointments, symptoms
│   ├── services/           # Business logic: email service, tier enforcement, reminder scheduling
│   └── app.js              # Express app entry point
├── tests/
│   ├── unit/
│   └── integration/
└── package.json

frontend/
├── src/
│   ├── components/         # Reusable UI components (forms, cards, notification badges)
│   ├── pages/              # Route-level views: Auth, Dashboard, DogProfile, Vaccinations, Medications, Appointments, Symptoms
│   ├── store/              # Redux Toolkit slices: auth, dogs, health records
│   ├── services/           # API client wrappers
│   └── main.jsx            # React entry point
├── tests/
└── package.json
```

**Structure Decision**: Web application layout with sibling `backend/` and `frontend/` directories at the repo root. Backend is a modular Express monolith (not microservices — see research.md §1 for rationale). Frontend is a React SPA with Redux Toolkit for state management.

## Complexity Tracking

*No constitution violations to justify — constitution not yet established.*
