# Technical RFC

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
