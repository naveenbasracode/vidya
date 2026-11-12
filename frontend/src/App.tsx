import React, { useState } from 'react';
import {
  Content,
  Grid,
  Button,
  Checkbox,
  Alert,
  DataTable,
  Header,
  Text,
  Flex,
  Link,
  Pagination,
  Search,
  PaginationItem,
  Split,
  SplitItem,
  Typography,
  InlineReviews,
  Tag,
} from '@carbon/react';
import './App.css';

// --- Mock Data for Demo ---
const mockSchedule = [
  { id: 1, subject: 'Mathematics', startTime: '09:00 AM', endTime: '10:00 AM', type: 'Study' },
  { id: 2, subject: 'English', startTime: '11:00 AM', endTime: '12:00 PM', type: 'Study' },
  { id: 3, subject: 'Quantitative Reasoning', startTime: '02:00 PM', endTime: '03:00 PM', type: 'Study' },
];

const mockRoadmap = [
  { year: 'Grade 5', goals: 'Mastering basic arithmetic, Reading fluency' },
  { year: 'Grade 6', goals: 'Algebraic thinking, Advanced comprehension' },
  { year: 'Grade 7', goals: 'Complex problem solving, Literary analysis' },
];

const mockAchievements = [
  { subject: 'Mathematics', score: 96, status: 'Green' },
  { subject: 'English', score: 88, status: 'Amber' },
  { subject: 'Verbal Reasoning', score: 78, status: 'Red' },
];

// --- Components ---

/**
 * Dashboard Component (Task 15)
 * Provides an overview of the current daily schedule, 3-year roadmap, and achievement status.
 */
const Dashboard = () => {
  return (
    <div className="cds__container">
      <Header>
        <div className="cds__header-title">
          <h1 className="cds__title">Student Dashboard</h1>
          <p className="cds__subtitle">Your Learning Journey</p>
          <p className="cds__description">A-level progress tracker and daily schedule.</p>
        </div>
      </Header>

      <Grid>
        <Grid.Item col_8>
          <Content>
            <h2 className="cds__title">Daily Schedule</h2>
            <DataTable
              rows={mockSchedule.map(s => ({
                id: s.id,
                header: 'Subject',
                cells: [[s.subject, s.startTime, s.endTime]]
              }))}
            />
          </Content>
        </Grid.Item>
        <Grid.Item col_4>
          <Content>
            <h2 className="cds__title">3-Year Roadmap</h2>
            <div className="cds__roadmap">
              {mockRoadmap.map((m, i) => (
                <div key={i} className="cds__roadmap-item">
                  <p><strong>{m.year}:</strong> {m.goals}</p>
                </div>
              ))}
            </div>
          </Content>
        </Grid.Item>
      </Grid>

      <div className="cds__container">
        <h2 className="cds__title">Achievement Status</h2>
        <DataTable
          rows={mockAchievements.map(a => ({
            id: a.subject,
            header: 'Subject',
            cells: [[a.subject, `${a.score}%`, a.status]]
          }))}
        />
      </div>
    </div>
  );
};

/**
 * Practice & Exam Module (Task 16)
 * Handles the presentation of practice questions and timed examinations.
 */
const PracticeModule = () => {
  const [isExamMode, setIsExamMode] = useState(false);

  return (
    <div className="cds__container">
      <Header>
        <h1 className="cds__title">Practice & Exams</h1>
      </Header>
      <Content>
        {isExamMode ? (
          <div className="cds__message">
            <p><strong>Active Exam:</strong> Quantitative Reasoning (45 Minutes)</p>
            <div className="cds__button-group">
              <Button onClick={() => setIsExamMode(false)}>Submit Final Answer</Button>
            </div>
          </div>
        ) : (
          <div className="cds__message">
            <p>Select a topic from the curriculum to begin a practice set.</p>
            <div className="cds__button-group">
              <Button onClick={() => setIsExamMode(true)}>Start 45-Minute Mock Exam</Button>
            </div>
          </div>
        )}
      </Content>
    </div>
  );
};

/**
 * Activity Tracker (Task 17)
 * Simple checklist for daily habits and co-curricular commitments.
 */
const ActivityTracker = () => {
  const [tasks, setTasks] = useState([
    { id: 1, name: '15-min Reading', completed: false },
    { id: 2, name: '15-min Karate', completed: false },
    { id: 3, name: '15-min Drum Practice', completed: false },
  ]);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="cds__container">
      <h2 className="cds__title">Daily Habits</h2>
      <div className="cds__list">
        {tasks.map(t => (
          <div key={t.id} className="cds__list__item">
            <Checkbox
              Checked={t.completed}
              OnChange={() => toggleTask(t.id)}
              Label={t.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="cds__container">
      <header className="cds__header">
        <h1 className="cds__title">Vidya</h1>
        <p className="cds__subtitle">Study & Activity Planner</p>
      </header>

      <div className="cds__navigation">
        <a href="#dashboard">Dashboard</a>
        <a href="#practice">Practice</a>
        <a href="#tracker">Activity</a>
      </div>

      <Dashboard />
      <PracticeModule />
      <ActivityTracker />
    </div>
  );
}
```