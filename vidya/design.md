# High-Level Design (HLD): Vidya Study & Activity Planner

## Overview
The High-Level Design (HLD) for Vidya outlines the flow of information and interactions between users and system components. It ensures that the functional requirements defined in the specification are met by the architecture established in the architecture document.

## Flow Descriptions

### 1. Developer/Admin Setup Flow (Initialization)
*   **Goal:** Populate the system with educational content and administrative rules.
*   **Process:**
    1.  **Access:** The Administrator/Developer logs into the **Content Management Interface** via the **Frontend**.
    2.  **Upload:** The Admin/Developer uploads PDF files for Subjects (Maths, English, Quantitative, Verbal Reasoning).
    3.  **Storage:** The **Backend** receives these files and saves them to the **Document Repository** (Local File System).
    4.  **Configuration:** The Admin configures the 3-year exam bank and identifies specific topics for review.
    5.  **Result:** The system is now populated with the "Static Curriculum" (FR7, FR15).

### 2. Content Generation Flow
*   **Goal:** Provide practice questions and assessments for specific subjects.
*   **Process:**
    1.  **Request:** A student selects a specific topic (e.g., "Multiplication") from the **Student Dashboard**.
    2.  **Processing:** The **Content & Grading Engine** parses the relevant uploaded PDF and generates a set of practice questions.
    3.  **Display:** The **Frontend** displays the questions to the student.
    4.  **Execution:** The student answers the questions; the **Grading Engine** evaluates the responses and provides a score and instructional feedback (FR8, FR11).

### 3. Parent Configuration Flow
*   **Goal:** Define the constraints for the student's daily schedule.
*   **Process:**
    1.  **Access:** The Parent logs into the **Parent/Admin Dashboard**.
    2.  **Input:** The Parent enters co-curricular activities (e.g., "Drum Class" on Wednesdays at 6:00 PM).
    3.  **Processing:** The **Scheduling Engine** receives this input and identifies potential time conflicts with study blocks.
    4.  **Output:** The **Database** stores the updated activity constraints.

### 4. Automated Timetable Generation Flow
*   **Goal:** Produce a conflict-free, prioritized study plan.
*   **Process:**
    1.  **Trigger:** Upon submission of activity constraints or manual request.
    2.  **Analysis:** The **Scheduling Engine** retrieves the student's current performance scores from the **Database**.
    3.  **Logic:** The engine prioritizes subjects with the lowest scores.
    4.  **Generation:** The engine generates a daily study schedule that avoids all co-curricular activity times.
    5.  **Persistence:** The new schedule is saved to the **Schedule Store**.
    6.  **Sync:** The **Frontend** reflects the updated schedule to the Student.

### 5. Student Interaction Flow
*   **Goal:** Daily execution of the study plan and activity tracking.
*   **Process:**
    1.  **Review:** The student views the daily schedule on the **Student Dashboard**.
    2.  **Action:** The student participates in study blocks, practice questions, and 45-minute exams.
    3.  **Tracking:** The student marks daily tasks (e.g., "15 mins Reading") as complete.
    4.  **Update:** The **Activity & Achievement Tracker** updates the student's progress in the **Database**.

### 6. Parent Performance Reports Flow
*   **Goal:** Monitoring and alerting.
*   **Process:**
    1.  **Access:** The Parent views the **Achievement Dashboard**.
    2.  **Aggregation:** The system aggregates data from the **Academic & Activity Records**.
    3.  **Analysis:** The **Alerting Service** checks for "Red" status (Scores < 85%).
    4.  **Notification:** If a "Red" status or a missed activity is detected, the **Alerting Service** triggers an in-app notification.

## Component Interactions & Data Movement

| Actor | Action | Component Involved | Data Movement |
| :--- | :--- | :--- | :--- |
| **Admin/Dev** | Upload PDF | Backend $\rightarrow$ File System | PDF File |
| **Parent** | Input Co-Curricular | Backend $\rightarrow$ Database | Activity Name, Day, Time |
| **Backend** | Generate Schedule | Scheduling Engine $\leftrightarrow$ Database | Priority Score $\rightarrow$ Time Blocks |
| **Student** | Submit Exam/Activity | Frontend $\rightarrow$ Backend | Responses, Status |
| **Grading Engine**| Evaluate Response | Backend $\rightarrow$ Database | Score, Feedback |
| **Alerting Service**| Monitor Achievement | Database $\rightarrow$ Alerting Service | Score $\rightarrow$ Notification Trigger |

## Traceability to Specification
*   **FR1-FR2 (Auth & Co-Curricular):** Handled by the **Parent Configuration Flow** and **Authentication Service**.
*   **FR3-FR4 (Scheduling):** Handled by the **Automated Timetable Generation Flow**.
*   **FR6-FR9 (Content & Practice):** Handled by the **Content Generation Flow**.
*   **FR11 (Grading):** Handled by the **Grading Engine** within the Content flow.
*   **FR12-FR13 (Dashboard & Alerting):** Handled by the **Parent Performance Reports Flow**.
*   **FR15 (Admin Controls):** Handled by the **Developer/Admin Setup Flow**.
