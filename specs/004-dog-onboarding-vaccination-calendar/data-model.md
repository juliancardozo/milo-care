# Data Model - Feature 004

## Overview

This onboarding model preserves the existing embedded-dog approach in User documents while adding fields required for preventive calendar generation in AR/UY.

## Owner Fields

- name (required)
- email (required)
- phone (optional)
- country (required, AR|UY)
- city (optional)
- timezone (optional)
- disclaimerAccepted (required)

## Dog Fields

- name (required)
- breed (required)
- dateOfBirth (required unless estimated)
- birthDateConfidence (exact|estimated|unknown)
- estimatedAgeMonths (optional)
- sex (male|female|unknown)
- neutered (boolean)
- weightKg (optional)
- microchipId (optional)
- countryProfile (AR|UY)
- lifeStage (derived)
- riskProfile (derived)
- hasVeterinarian (boolean)
- veterinarianName (optional)
- allergies[]
- conditions[]
- lifestyle {}

## Preventive Events

### Vaccination

- vaccineName
- dateAdministered
- nextDueDate
- nextReminderAt
- status (suggested|upcoming|programado|completed|cancelled|vencido|pending_vet_validation)
- source (manual|suggested|imported)
- requiresVetValidation (boolean)

### Deworming

- productName
- parasiteType (internal|external|both)
- dateAdministered
- nextDueDate
- nextReminderAt
- status (same status model)
- source
- requiresVetValidation

### Appointments

- clinicName
- appointmentDate
- reminderAt
- status
- source

## Onboarding Session (TTL)

Transient entity persisted in `onboardingSessions`:

- userId
- owner {}
- dog {}
- clinical {}
- lifestyle {}
- vaccines []
- deworming []
- redFlags []
- status (draft|blocked|confirmed|expired)
- expiresAt (TTL index)
