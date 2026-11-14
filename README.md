# Vidya - Study & Activity Planner

Vidya is a holistic planning and tracking system designed for students in Grades 5-7. It helps students manage their academic progress in Mathematics, English, Verbal, and Quantitative skills while seamlessly integrating their co-curricular activities (like sports, music, and clubs).

## Features

- **Automated Scheduling:** Generate a study plan that avoids conflicts with extracurricular activities.
- **Content Generation:** Generate practice questions and identify key topics from uploaded curriculum PDFs.
- **Automated Grading:** Receive instant feedback and scores on open-ended essay responses.
- **Progress Tracking:** A 3-year roadmap and Achievement Dashboard (Green/Amber/Red status) to monitor progress.
- **Activity Tracking:** Track and monitor daily habits like reading and practice sessions.

## Tech Stack

- **Frontend:** React, Carbon Design System
- **Backend:** Node.js, Express, PostgreSQL
- **Testing:** Jest, Supertest

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd vidya
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

Create a `.env` file in the `backend/` directory and add the following:

```env
DATABASE_URL=postgresql://[user]:[password]@localhost:5432/vidya_db
JWT_SECRET=[your_secret_key]
PORT=5000
```

### Running the Application

Open two separate terminal windows:

**Terminal 1: Backend**
```bash
cd backend
# Initialize database
npx prisma generate
# Run migrations
npx prisma migrate dev
# Start the server
npm start
```

**Terminal 2: Frontend**
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`.

## Architecture Overview

- **Scheduling Engine:** Prioritizes subjects based on student performance scores.
- **Content Engine:** Handles PDF ingestion and practice generation.
- **Achievement Tracker:** Calculates status for academic and activity goals.
- **Alerting System:** Provides in-app notifications for low-score warnings.
