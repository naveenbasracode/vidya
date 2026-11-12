# Architecture Specification: Vidya Study & Activity Planner

## Purpose
The Vidya system provides a structured, automated environment for students in Grades 5-7 to manage academic growth and extracurricular activities. The architecture is designed to support automated scheduling, content generation from PDF materials, and performance tracking with automated grading and alerting.

## System Context
The application is a web-based platform designed to run on a local environment (`localhost`). It serves three primary personas:
1. **Students:** Interact with the study plan, practice questions, and exam modules.
2. **Parents:** Manage the co-curricular schedule and monitor the student's progress.
3. **Admin/Developers:** Manage the underlying content (PDFs) and the 3-year exam bank.

## Major Components

### 1. Frontend (React)
- **Student Dashboard:** Displays the daily schedule, progress roadmap, and achievement status.
- **Interactive Study Modules:** Handles practice question generation, exam sessions, and essay submission interfaces.
- **Parent/Admin Dashboard:** Provides interfaces for co-curricular input, schedule overrides, and achievement monitoring.
- **Content Management Interface:** Dedicated view for Admin/Dev to upload PDFs and manage exam configurations.

### 2. Backend (Node.js)
- **Authentication & Authorization Service:** Manages user identities and enforces Role-Based Access Control (RBAC) between Students, Parents, and Admins.
- **Scheduling Engine:** Core logic for generating conflict-free, priority-based study blocks based on academic performance.
1. **Content & Grading Engine:** Orchestrates PDF processing, practice question generation, and automated essay grading.
- **Activity & Achievement Tracker:** Tracks daily habits and calculates achievement statuses (Green/Amber/Red).
- **Alerting Service:** Monitors data for "Red" status (score < 85%) or missed activities to trigger in-app notifications.

### 3. Database (PostgreSQL)
- **Identity/Profile Store:** User data and role assignments.
- **Schedule Store:** Saved study blocks and co-curricular activity schedules.
- **Academic & Activity Records:** Historical scores, practice results, and completed daily tasks.
- **Configuration Store:** Managed exam settings and 3-year roadmap milestones.

### 4. File Storage (Local Application Folder)
- **Document Repository:** Stores uploaded PDF materials for Math, English, Quantitative, and Verbal Reasoning.

## Component Responsibilities and Boundaries

| Component | Responsibility | Boundary |
| :--- | :--- | :--- |
| **Frontend** | UI Rendering, State Management (User-facing), Alert Display | Does not perform logic for scheduling or grading. |
| **Backend** | Scheduling logic, Content Processing, Grading, Notification Triggering | Does not manage UI state or persistent file storage. |
| **Database** | Relational data storage (Users, Scores, Schedules) | Does not perform logic; only data persistence. |
| **File System** | Raw PDF storage | Does not serve content; managed by the Backend. |

## Data Flow

### 1. Schedule Generation Flow
1. **Input:** Parent enters co-curricular activities $\rightarrow$ **Backend** identifies conflicts.
2. **Processing:** **Scheduling Engine** calculates priority (lowest scores first) $\rightarrow$ **Database** saves new schedule.
3. **Output:** **Frontend** reflects updated daily/weekly schedule.

### 2. Content/Grading Flow
1. **Input:** Admin/Dev uploads PDF $\rightarrow$ **File System** stores the file.
2. **Processing:** Student selects topic $\rightarrow$ **Content Engine** parses PDF/generates questions $\rightarrow$ **Grading Engine** evaluates submission $\rightarrow$ **Database** stores score.
3. **Output:** **Frontend** displays results and **Alerting Service** triggers if score is < 85%.

### 3. Achievement Tracking Flow
1. **Input:** Student completes an exam or a daily task.
2. **Processing:** **Activity Tracker** updates score/status $\rightarrow$ **Alerting Service** checks for "Red" status.
3. **Output:** **Frontend** updates the Achievement Dashboard and **Alerting Service** triggers in-app notification.

## Cross-cutting Requirements
- **Role-Based Access Control (RBAC):** Separate permissions for Students (Self-tracking), Parents (Activity/Schedule oversight), and Admins (Content management).
- **Responsiveness:** The schedule view must load in under 2 seconds (NFR3).
- **Data Persistence:** All relational data must persist in PostgreSQL (NFR2).
- **Visibility:** The Academic Achievement Dashboard must provide color-coded feedback (Green/Amber/Red) (NFR4).

## Key Architecture Decisions

| Decision | Rationale | Traceability |
| :--- | :--- | :--- |
| **Local File Storage** | Simplicity and privacy for local-run applications. | NFR1, FR7 |
| **Priority-Based Scheduling** | Ensures students focus on their weakest areas first. | FR4 |
| **Automated Grading Engine** | Required for high-volume academic tracking and feedback. | FR11 |
| **Role-Based Access (RBAC)** | Ensures student privacy and parental/admin control over schedules. | FR1, FR7 |

## Assumptions or Decisions for Human Review
- **Scheduling Priority:** For "Lowest Score" calculation, should we use the average of the last 3 exams or the current total average?
- **Alerting Logic:** Should the "Red" status (under 85%) trigger an immediate notification or a weekly summary?
- **Grading Feedback:** Should the "Instructional Feedback" be generated as a free-text summary or based on a set of predefined categories?
- **Admin/Dev Access:** Should the Admin/Developer interface be accessible on the same domain as the student/parent interfaces, or a separate management portal?
