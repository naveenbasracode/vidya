# Implementation Plan: Vidya Study & Activity Planner

## Summary
The Vidya application is a personalized academic management system for students in Grades 5-7. It provides automated, conflict-free study scheduling that prioritizes subjects based on student performance, interactive practice and exam modules, and a comprehensive dashboard for parents to monitor progress and identify areas of need.

## Technical Context
The implementation will follow a modern full-stack architecture:
- **Frontend:** React for a responsive, interactive web interface.
- **Backend:** Node.js to handle complex scheduling logic, content processing, and automated grading.
- **Database:** PostgreSQL for persistent storage of user profiles, schedules, and academic records.
- **Storage:** Local application directory for hosting PDF-based curriculum materials.

## Components and Boundaries
- **Authentication & Authorization Service:** Manages user identities and enforces Role-Based Access Control (RBAC).
- **Scheduling Engine:** Responsible for the core logic of generating priority-based study blocks.
- **Content & Grading Engine:** Handles PDF processing, practice generation, and automated essay evaluation.
- **Activity & Achievement Tracker:** Manages daily task completion and calculates the Green/Amber/Red achievement statuses.
- **Alerting Service:** A background monitor for "Red" status and missed activities.

## Interfaces and Integrations
- **Frontend to Backend:** RESTful interaction for schedule updates, content retrieval, and activity tracking.
- **Backend to Database:** CRUD operations for all core entities (Schedules, Scores, Activities).
- **Backend to File System:** Access to local PDF repository for content generation.
- **Alerting System:** Integration between the Achievement Tracker and the Notification service to trigger in-app alerts.

## Data Model Summary
The implementation will center on the following primary entities:
- **Users:** Profiles including Role (Student, Parent, Admin) and personal details.
- **Schedules:** Time blocks associated with specific study subjects and recurring co-curricular activities.
- **Academic Records:** Historical data including Exam scores, Practice results, and Topic-specific performance.
- **Activity Logs:** Tracking of daily habits (Reading, Practice, etc.) and completion status.
- **Content Repository:** Mapping of PDF records to specific subjects and identifying topics.

## Key Decisions and Rationale
- **Priority-Based Scheduling:** We will prioritize the "weakest" subjects (lowest recent scores) to ensure students spend more time on areas needing improvement.
- **Automated Grading:** Grading is performed on the backend to ensure consistent logic for scoring and instructional feedback.
- **Local File Storage:** Using the local directory for PDFs maintains privacy and simplifies the deployment for a local-run application.
- **RBAC:** Role-based access ensures that only Parents and Admins can modify schedules or view specific achievement data.

## Risks and Assumptions
- **Content Quality:** The system's effectiveness for content generation and grading is directly dependent on the clarity and quality of the uploaded PDF materials.
- **Concurrent Activities:** The system assumes a single primary co-curricular activity per time slot; any overlaps entered by a parent will be flagged as conflicts.
- **Execution Environment:** The application assumes access to a local PostgreSQL instance and local file system storage during development and production.
- **Grading Accuracy:** Automated grading results are based on the "Static Curriculum" provided by the client; any discrepancies in feedback are managed via the Admin's ability to edit exam configurations.
