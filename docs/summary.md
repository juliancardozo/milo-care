# Milocura — Project Summary

## 1. Discovery Brief

## Project Overview
Milocura is a SaaS MVP named "Milo Care" designed to revolutionize pet care management. The project aims to provide pet owners with a simple, emotional, and modern experience to manage their dog's health. By centralizing health tracking, Milo Care empowers users to ensure their pets receive timely care, enhancing their well-being and fostering a stronger bond between pets and owners.

## Problem Statement
Pet owners often struggle to keep track of their dog's health needs, such as vaccinations, medications, and vet visits. This can lead to missed appointments or treatments, adversely affecting the pet's health. Milo Care addresses this issue by offering a comprehensive platform to manage all aspects of a dog's healthcare in one place.

## Target Audience
- **Primary Users:** Dog owners who are tech-savvy and seek a digital solution for managing their pet's health.
- **Secondary Users:** Veterinarians who can recommend the app to clients for better health management.

## Core Value Proposition
Milo Care is uniquely valuable because it combines health tracking with an emotionally engaging user interface, making it easier and more enjoyable for pet owners to manage their dog's health. Its comprehensive functionality and user-centric design set it apart from other pet care apps.

## Key Features
- **Vaccination Tracking:** Log and receive reminders for upcoming vaccinations.
- **Medication Management:** Track medications and dosages with ease.
- **Veterinary Visit Scheduler:** Schedule and receive reminders for vet appointments.
- **Symptom Tracker:** Record and monitor symptoms to share with veterinarians.
- **User-Friendly Interface:** An intuitive and emotional design that enhances user engagement.
- **Health History Archive:** Maintain a complete health record for each pet.
- **Custom Notifications:** Personalized alerts for all health-related activities.

## Constraints & Assumptions
- **Technical Constraints:** Limited initial budget may restrict advanced feature development.
- **Business Constraints:** The need to validate the business model with early adopters before scaling.
- **Timeline Constraints:** Aim to launch MVP within six months to capture early market interest.

## Success Metrics
- **User Adoption Rate:** Achieve 1,000 active users within the first three months post-launch.
- **Engagement Metrics:** Users log at least three health activities per week.
- **Retention Rate:** Maintain a 70% user retention rate after six months.
- **Customer Satisfaction:** Achieve a Net Promoter Score (NPS) of 50 or higher.
- **Revenue Generation:** Generate $10,000 in revenue within the first six months through subscription models.

---

## 2. Product Requirements Document

## Executive Summary
Milocura, branded as "Milo Care," is a SaaS MVP designed to streamline pet care management for dog owners. This platform centralizes health tracking to ensure timely care, enhancing pet well-being and owner-pet relationships.

## Goals & Non-Goals
### Goals
- Provide a centralized platform for managing dog health.
- Offer features like vaccination tracking, medication management, and veterinary scheduling.
- Create an emotionally engaging user interface.
- Validate the business model with early adopters.

### Non-Goals
- Development of advanced features beyond core health management.
- Expansion to other pet types or broader veterinary services in this phase.

## User Personas
### Persona 1: Tech-Savvy Dog Owner
- **Name:** Laura
- **Role:** Marketing Professional
- **Goals:** Ensure her dog, Max, receives timely vaccinations and medications.
- **Pain Points:** Finds it challenging to remember vet appointments and medication schedules.

### Persona 2: Veterinarian
- **Name:** Dr. Carlos
- **Role:** Veterinary Doctor
- **Goals:** Recommend reliable health management tools to pet owners.
- **Pain Points:** Sees pet owners frequently miss follow-ups and medication schedules.

## Feature Requirements
### Vaccination Tracking
- **Description:** Log vaccinations and receive reminders.
- **User Story:** As a dog owner, I want to receive reminders for vaccinations so that I never miss an important date for my pet's health.
- **Acceptance Criteria:**
  1. Users can log vaccination details.
  2. Users receive timely reminders for upcoming vaccinations.
  3. Users can view a history of vaccinations.

### Medication Management
- **Description:** Track medications and dosages.
- **User Story:** As a dog owner, I want to track my dog's medication schedule so that I can administer doses accurately.
- **Acceptance Criteria:**
  1. Users can enter medication details and dosage.
  2. Users receive reminders for medication times.
  3. Users can view past medication logs.

### Veterinary Visit Scheduler
- **Description:** Schedule and receive reminders for vet appointments.
- **User Story:** As a dog owner, I want to schedule vet visits and receive reminders so that I never miss an appointment.
- **Acceptance Criteria:**
  1. Users can schedule vet appointments.
  2. Users receive reminders for upcoming appointments.
  3. Users can view appointment history.

## User Flows
### New User Registration
1. User downloads the Milo Care app.
2. User selects "Create New Account."
3. User enters personal details and pet information.
4. User sets up initial health tracking preferences.
5. User receives a welcome message and tutorial.

### Logging a Vaccination
1. User selects "Add Vaccination" from the dashboard.
2. User enters vaccination details (type, date, etc.).
3. User sets a reminder for the next vaccination.
4. User saves the entry, which updates the health history archive.

## Edge Cases & Error States
- **No Internet Connection:** Display a message indicating offline status and save data locally until reconnection.
- **Duplicate Entries:** Alert users when they attempt to enter duplicate vaccination or medication records.
- **Missed Reminders:** Allow users to reschedule missed reminders easily.

## Open Questions
1. What subscription models will be most appealing to early adopters?
2. How will veterinarians be incentivized to recommend Milo Care to their clients?
3. What specific data privacy measures need to be implemented to protect user information?

---

## 3. Technical RFC

## Summary
Milocura, branded as "Milo Care," is a SaaS MVP focused on providing a centralized platform for managing dog health. The application aims to offer a simple, engaging, and modern experience for pet owners to track vaccinations, medications, and veterinary appointments, thereby enhancing pet well-being and strengthening the bond between pets and owners.

## Technical Approach
The chosen technology stack includes:
- **Frontend:** React.js for building a responsive and interactive user interface.
- **Backend:** Node.js with Express.js for handling API requests and business logic.
- **Database:** MongoDB for flexible and scalable data storage.
- **Hosting:** AWS for scalable cloud infrastructure.
- **Notifications:** Firebase Cloud Messaging for push notifications.

Key architectural decisions include using a microservices architecture to allow independent deployment and scaling of different modules, and leveraging a NoSQL database to accommodate varying data structures and rapid iterations.

## Component Architecture
1. **Dashboard Component:** Displays an overview of the pet's health status and upcoming reminders.
2. **Vaccination Tracker Component:** Allows users to log and view vaccination records.
3. **Medication Manager Component:** Enables tracking of medication schedules and dosages.
4. **Appointment Scheduler Component:** Facilitates scheduling and viewing of vet appointments.
5. **Symptom Tracker Component:** Provides functionality to record and monitor symptoms.
6. **Notification Component:** Manages custom alerts and reminders for health-related activities.

## Data Models
### Pet
| Field          | Type   | Description                      |
|----------------|--------|----------------------------------|
| id             | String | Unique identifier for the pet    |
| name           | String | Name of the pet                  |
| breed          | String | Breed of the pet                 |
| age            | Number | Age of the pet                   |
| ownerId        | String | Identifier for the pet owner     |

### Vaccination
| Field          | Type   | Description                      |
|----------------|--------|----------------------------------|
| id             | String | Unique identifier for the record |
| petId          | String | Identifier for the pet           |
| type           | String | Type of vaccination              |
| date           | Date   | Date of vaccination              |
| reminderDate   | Date   | Date for the next reminder       |

### Medication
| Field          | Type   | Description                      |
|----------------|--------|----------------------------------|
| id             | String | Unique identifier for the record |
| petId          | String | Identifier for the pet           |
| medicationName | String | Name of the medication           |
| dosage         | String | Dosage instructions              |
| schedule       | Date[] | Scheduled dates for medication   |

## API Design
### Endpoints
- **GET /pets:** Retrieve all pets associated with a user.
- **POST /vaccinations:** Log a new vaccination record.
- **GET /medications:** Retrieve medication records for a pet.
- **POST /appointments:** Schedule a new veterinary appointment.
- **GET /symptoms:** Retrieve symptom records for a pet.

### Data Flow
- **Frontend:** Interacts with the backend through RESTful APIs to fetch and display data.
- **Backend:** Processes requests, performs CRUD operations on the database, and sends notifications as needed.

## State Management
The application state will be managed using Redux for predictable state changes and to facilitate debugging. Key state slices include user authentication, pet profiles, health records, and notification settings.

## Performance Considerations
Anticipated bottlenecks include high traffic during peak hours and large data retrievals. Mitigation strategies involve:
- Implementing server-side caching with Redis.
- Using pagination for data-heavy endpoints.
- Optimizing database queries with indexes.

## Security Considerations
Key security requirements include:
- User authentication and authorization using JWT.
- Data encryption in transit and at rest.
- Regular security audits and vulnerability assessments.
- Compliance with data protection regulations such as GDPR.

## Alternatives Considered
- **Monolithic Architecture:** Rejected due to lack of scalability and flexibility compared to microservices.
- **SQL Database:** Considered but rejected in favor of NoSQL for its schema-less nature and ease of handling diverse data types.
- **Native Mobile App:** Deferred to a later phase to prioritize web-based MVP launch.
