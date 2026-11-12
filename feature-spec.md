# Feature Specification: Vidya Study & Activity Planner

## 1. Goal and Expected Outcome
The goal of **Vidya** is to provide a holistic planning and tracking system for students in Grades 5-7. It aims to help students manage their academic progress (Maths, English, Verbal, and Quantitative skills) alongside their co-curricular activities (e.g., Karate, Drum classes).

**Expected Outcome:**
Students will have a clear, automated daily schedule that respects their extracurricular commitments. Parents will have a dashboard to monitor progress, and students will have a structured 3-year roadmap to achieve academic milestones.

## 2. Target Users and Scenarios
- **Student (Primary User):** Needs to see what to study and when, track daily habits (reading, practice), and see their current performance levels.
- **Parent (Admin):** Needs to input co-curricular schedules, monitor the student's weekly achievements, and manually override the automatically generated schedule when necessary.

**Scenarios:**
- **Scenario A:** A parent enters a "Drum Class" on Wednesday at 6:00 PM. The system automatically ensures no study blocks are scheduled during that time.
- **Scenario B:** A student completes a daily "15-minute Reading" task. The system marks this as a completed activity and updates the achievement tracker.
- **Scenario C:** A student takes an exam. The system calculates a score and updates the "Academic" achievement tracker with a color-coded status (Green/Amber/Red).
- **Scenario D:** A parent selects a "Multiplication" topic from the uploaded PDF. The system generates a set of practice questions for the student.
- **Scenario E:** A student submits an essay response. The system analyzes the response against the curriculum and provides a score and qualitative feedback.

## 3. Scope and Out of Scope
**In Scope:**
- User Authentication (Student and Parent).
- Co-Curricular activity input and management.
- Automated study block generation.
- Manual Schedule Override (Parental control).
- Activity Tracker (Daily habits).
- Exam Module (4-exam set).
- Achievement Dashboard (Academic & Activity categories).
- 3-Year Progress Roadmap.
- **Content Generation:** System-led generation of practice questions from uploaded PDF materials.
- **Automated Grading:** System-led evaluation of open-ended essay responses.
- **Alerting:** In-app notifications for performance drops and missed activities.

**Out of Scope:**
- Manual Content Creation: The application will not allow users to manually write questions into the system.
- Peer-to-peer interaction or social features.
- Automated grading of non-essay (e.g., purely mathematical) questions (unless specified as a separate type).

## 4. Functional Requirements
- **FR1: Authentication System:** The system must allow users to register and log in as either a Student or a Parent.
- **FR2: Co-Curricular Input:** Parents must be able to input specific activities (Name, Day, Time) for the student.
- **FR3: Automated Schedule Generator:** Based on the co-curricular inputs, the system must generate a daily study schedule that avoids overlapping with scheduled activities.
- **FR4: Priority Scheduling:** The system must prioritize study blocks for subjects where the student has the lowest current performance scores.
- **FR5: Manual Schedule Override:** Parents must be able to edit or re-assign any time block in the generated schedule.
- **FR6: Activity Tracker:** Students must be able to mark daily tasks (e.g., "15 mins Karate") as completed.
- **FR7: Content Ingestion:** The system must allow the development team/admin to upload PDF files for Maths, English, Quantitative, and Verbal Reasoning.
- **FR8: Practice Generation:** Based on a user-selected topic from the uploaded PDFs, the system must generate a set of practice questions.
- **FR9: Error Handling (Content):** If a selected topic is not found in the uploaded PDF, the system must display an error message suggesting the user provide a different PDF.
- **FR10: Exam Module:** The system must support 4 distinct exams, each lasting 45 minutes.
- **FR11: Automated Grading:** The system must accept a student's essay submission, evaluate it against the curriculum standards, and provide a numerical score and qualitative instructional feedback.
- **FR12: Achievement Dashboard:** The system must display:
    - **Academic Achievement:** Based on exam scores.
    - **Activity Achievement:** Based on completion of scheduled tasks (Reading, Practice, etc.).
- **FR13: Alerting System:** The system must send in-app notifications if a student's score falls below 85% (Red status) or if a scheduled activity is missed.
- **FR14: Progress Tracking:** The system must display a 3-year holistic plan that highlights milestones based on student progress.
- **FR15: Admin/Developer Controls:** The system must provide an interface for the development team/admin to manage the 3-year exam bank and modify exams as required.

## 5. Non-functional Requirements
- **NFR1: Platform:** The application must run as a web application accessible via `localhost`.
- **NFR2: Data Persistence:** All user data, schedules, and scores must be stored in a local PostgreSQL database.
- **NFR3: Responsiveness:** The schedule view must load in under 2 seconds.
- **NFR4: Visual Feedback:** The achievement tracker must use the following color-coded thresholds:
    - **Green:** Score $\ge$ 95%
    - **Amber:** Score 85% - 94%
    - **Red:** Score < 85%
- **NFR5: Accuracy:** The grading system must provide a consistency score of $\ge$ 80% compared to human-reviewed benchmarks for common curriculum topics.

## 6. Acceptance Criteria
| Requirement | Given | When | Then |
| :--- | :--- | :--- | :--- |
| **Schedule Generation** | A parent enters a Drum class on Wednesday at 6:00 PM | The system generates the weekly schedule | No study blocks are scheduled during the Drum class time. |
| **Prioritized Scheduling** | A student has a low score in "Maths" | The system generates the weekly schedule | "Maths" study blocks are prioritized in the daily schedule. |
| **Schedule Override** | A study block is generated for 4:00 PM | The Parent changes it to 5:00 PM | The schedule reflects the 5:00 PM change immediately. |
| **Task Completion** | A student logs in and sees a "Reading" task | The student marks the task as complete | The task is marked as done and the achievement tracker is updated. |
| **Content Generation** | A parent selects a topic (e.g., "Fractions") | The system processes the uploaded PDF | A set of practice questions is displayed to the student. |
| **Error Handling** | A topic is selected that is not in the PDF | The user views the content | An error message appears suggesting a different PDF. |
| **Automated Grading** | A student submits an essay response | The system processes the submission | The student receives a numerical score and instructional feedback. |
| **Alerting System** | A student's score falls below 85% | The system checks the status | An in-app notification is sent for "Red" status. |
| **Achievement Tracking** | A student completes an exam with a score of 90% | The dashboard is viewed | The result is displayed in the "Amber" category. |
| **Exam Timing** | A student starts an exam | The exam is active | The exam is timed for exactly 45 minutes. |

## 7. Assumptions and Open Questions
- **Assumption:** The system's ability to generate content and grade essays is dependent on the quality and clarity of the provided PDF materials.
- **Assumption:** The "Static Curriculum" is provided by the user/admin, not generated by AI.
- **Assumption:** The development team will provide the PDF data and the 3-year exam bank during the development phase.
- **Open Question:** How should the system handle conflicting activities entered by the parent? (e.g., two classes at once). — **Owner: Product Owner**
- **Open Question:** What is the expected "depth" of the grading (e.g., simple keyword matching vs. semantic understanding of the essay)? — **Owner: Product Owner**
