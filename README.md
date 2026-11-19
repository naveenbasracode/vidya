# 🦉 Vidya – Study & Activity Planner

Vidya helps students in **Grades 5–7** balance study in **Maths, English, Verbal and Quantitative Reasoning** with their co-curricular activities (sports, music, clubs), and gives parents a clear view of progress.

It runs locally on your Mac: a React web app at `http://localhost:3000`, a Node.js API on port 5000 and a local PostgreSQL database.

## What it does

| Feature | Where |
| --- | --- |
| Login & registration for students and parents (admin account is created by the seed) | Login / Register |
| First-login form for **school timings** and **activities** (e.g. Drums, Wednesday 6–7 pm, 15 min daily practice) | My Activities |
| **Automatic timetable**: no clashes with school or activities; days with an activity are kept free of study (can be switched off); **weakest subjects get the most and earliest blocks** | My Week |
| Parents (and students) can **move, add, delete or re-subject any block**; hand-edited blocks are kept when the timetable is rebuilt | My Week |
| **Daily habits** to tick off: Reading 15 min by default + "<activity> practice" for each activity with practice minutes | Today |
| **Practice** for every curriculum topic (Grades 5–7), mixed practice, and **questions generated from uploaded PDFs** (with a clear error if the topic is not in the PDF) | Practice |
| **Essay writing** with automated, explainable grading (length, structure, sentences, vocabulary, relevance) and feedback | Practice → English → Essay writing |
| **4 exams × 45 minutes** per grade, server-timed, auto-submitted when time runs out | Exams |
| **Weekly achievements**: Academic (exam/practice scores) and Activities (habits + study blocks), **Green ≥ 95%, Amber 85–94%, Red < 85%**, strengths & focus areas, 6-week history | Achievements |
| **3-year roadmap** (Grade 5 → 7) that marks topics mastered (85%+) and suggests next steps | 3-Year Plan |
| **In-app alerts** for scores below 85%, missed habits / study blocks, and red weeks | 🔔 |
| Parents link children, switch between them, assign practice | Family |
| Admin uploads curriculum PDFs and edits the exam bank | Curriculum PDFs / Exam Bank |

## Quick start (macOS)

**Prerequisites:** [Node.js 18+](https://nodejs.org) and PostgreSQL.

```bash
brew install node postgresql@16
brew services start postgresql@16
```

Then, from the project folder:

```bash
./scripts/setup.sh     # creates backend/.env, the vidya_db database, tables, exams and demo accounts
npm run dev            # starts the API (port 5000) and the web app (port 3000)
```

Open **http://localhost:3000**.

### Demo accounts (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Student (Grade 5, with Karate on Monday and Drums on Wednesday) | `student@vidya.local` | `student123` |
| Parent (linked to the student) | `parent@vidya.local` | `parent123` |
| Admin | `admin@vidya.local` | `admin123` |

Change or remove these before sharing the app with anyone.

## Manual setup

If you prefer to do it step by step:

```bash
# 1. Backend
cd backend
cp .env.example .env          # then edit DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                   # http://localhost:5000/api/health → {"ok":true}

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                     # http://localhost:3000
```

With Homebrew PostgreSQL the database user is usually your macOS username with no password:
`DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/vidya_db`

## Tests

```bash
cd backend && npm test
```

The unit tests cover the scheduler (no clashes, activity days free, weakest subject first, manual edits respected), Green/Amber/Red thresholds, weekly achievement maths, question generation for every topic, grading, essay scoring, PDF-topic matching and the roadmap.

## Project structure

```
backend/
  prisma/schema.prisma      data model (users, commitments, habits, study blocks, scores, exams, PDFs, alerts)
  prisma/seed.ts            exams + demo accounts
  src/domain/               pure logic: scheduler, curriculum, question generators, grading, achievements, roadmap
  src/routes/               REST API (auth, family, planner, learning, progress, admin)
  src/services/             timetable regeneration, habit sync, alerts
  tests/                    unit tests (node:test)
frontend/
  src/pages/                Today, My Week, Practice, Exams, Achievements, 3-Year Plan, Alerts, Family, Admin
  src/components/           app shell, questions/results, shared UI
scripts/
  setup.sh                  one-time setup
  dev.mjs                   runs backend + frontend together
```

## How a few things work

- **Timetable priority**: each subject's need is based on the average of its last 5 graded results (no data counts as 70%). Blocks are shared out in proportion to need, the weakest subject gets the first block of the week, every subject gets at least one block, and the same subject isn't repeated in one day when there's an alternative.
- **Study windows** default to 4–8 pm on weekdays and 9 am–5 pm at weekends, with 30-minute blocks, 15-minute breaks, up to 2 blocks per weekday and 3 per weekend day. Change these in **My Week → Preferences**.
- **Weekly academic achievement** averages all exams, practice sets and essays graded that week. **Activity achievement** is the share of daily habits and scheduled study blocks completed on days so far.
- **PDF practice** extracts the text from an uploaded PDF, finds sentences about the chosen topic and turns them into fill-in-the-blank questions. Scanned (image-only) PDFs have no text and cannot be used.
- **Essay grading** is a transparent rubric, not an AI model, so scores are consistent and every point is explained.

## Planning documents

`feature-spec.md`, `architecture.md`, `design.md`, `plan.md` and `tasks.md` describe the requirements this implementation follows.
