// Weekly Achievement Dashboard (FR12): academic (exam & practice scores) and activity (habits & study blocks).
import { useState } from 'react';
import { Button, Tile } from '@carbon/react';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, Meter, PageTitle, StatusBadge, SubjectChip } from '../components/common.jsx';
import { SUBJECTS, addDays, prettyDate, startOfWeek, statusFor, todayStr } from '../utils.js';

const KIND_LABEL = { EXAM: '📝 Exam', PRACTICE: '✏️ Practice', ESSAY: '🖊️ Essay' };

function HistoryChart({ history }) {
  return (
    <div className="history-chart" role="img" aria-label="Last six weeks of academic and activity percentages">
      {history.map((h) => (
        <div key={h.weekStart} className="history-chart__week">
          <div className="history-chart__bars">
            <div className={`history-chart__bar bar--academic status-bg--${(statusFor(h.academic) ?? 'none').toLowerCase()}`} style={{ height: `${h.academic ?? 0}%` }} title={`Academic ${h.academic ?? '–'}%`} />
            <div className={`history-chart__bar bar--activity status-bg--${(statusFor(h.activity) ?? 'none').toLowerCase()}`} style={{ height: `${h.activity ?? 0}%` }} title={`Activity ${h.activity ?? '–'}%`} />
          </div>
          <span className="history-chart__label">{prettyDate(h.weekStart, { day: 'numeric', month: 'short' })}</span>
        </div>
      ))}
      <div className="history-chart__legend">
        <span>
          <i className="swatch swatch--academic" /> Academic
        </span>
        <span>
          <i className="swatch swatch--activity" /> Activity
        </span>
        <span className="muted small">Lines: 95% (green) and 85% (amber)</span>
      </div>
    </div>
  );
}

export default function Progress() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayStr()));
  const { data, error, loading } = useLoad(() => studentApi(`/achievements?weekStart=${weekStart}`), [studentApi, weekStart, studentId]);
  const s = data?.summary;

  return (
    <>
      <PageTitle emoji="🏆" title={isStudent ? 'My achievements' : `${studentName}'s achievements`} subtitle={s ? `Week of ${prettyDate(s.weekStart, { day: 'numeric', month: 'long' })}` : undefined}>
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} iconDescription="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} />
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} iconDescription="Next week" disabled={addDays(weekStart, 7) > todayStr()} onClick={() => setWeekStart(addDays(weekStart, 7))} />
      </PageTitle>
      <ErrorNote error={error} />
      {loading && !data && <Busy />}
      {s && (
        <>
          <div className="achievement-cards">
            <Tile className={`achievement-card status-border--${(s.academic.status ?? 'none').toLowerCase()}`}>
              <h2>📖 Academic</h2>
              <StatusBadge status={s.academic.status} percent={s.academic.percent} big />
              <p className="muted">{s.academic.attempts ? `Average of ${s.academic.attempts} exam/practice result${s.academic.attempts > 1 ? 's' : ''} this week` : 'No exams or practice this week yet'}</p>
              <ul className="subject-status-list">
                {s.academic.bySubject.map((x) => (
                  <li key={x.subject}>
                    <SubjectChip subject={x.subject} small />
                    <StatusBadge status={x.status} percent={x.percent} />
                  </li>
                ))}
              </ul>
            </Tile>
            <Tile className={`achievement-card status-border--${(s.activity.status ?? 'none').toLowerCase()}`}>
              <h2>🏃 Activities</h2>
              <StatusBadge status={s.activity.status} percent={s.activity.percent} big />
              <p className="muted">
                {s.activity.done} of {s.activity.expected} tasks completed so far
              </p>
              <ul className="habit-progress">
                {s.activity.habits.map((h) => (
                  <li key={h.id}>
                    <span>
                      {h.name} ({h.minutes} min)
                    </span>
                    <span className="muted small">
                      {h.done}/{h.expected} days
                    </span>
                    <Meter value={h.expected ? (h.done / h.expected) * 100 : null} label={h.name} />
                  </li>
                ))}
                <li>
                  <span>📅 Study blocks</span>
                  <span className="muted small">
                    {s.activity.study.done}/{s.activity.study.expected}
                  </span>
                  <Meter value={s.activity.study.expected ? (s.activity.study.done / s.activity.study.expected) * 100 : null} label="Study blocks" />
                </li>
              </ul>
            </Tile>
          </div>

          <div className="two-col">
            <Tile className="section-tile">
              <h2>💪 Strong areas</h2>
              {s.strengths.length ? (
                s.strengths.map((x) => <SubjectChip key={x} subject={x} />)
              ) : (
                <p className="muted">Complete some practice this week to find your strengths!</p>
              )}
              <h2 className="spaced">🎯 Areas to focus on</h2>
              {s.focusAreas.length ? (
                <>
                  {s.focusAreas.map((x) => (
                    <SubjectChip key={x} subject={x} />
                  ))}
                  <p className="muted small">These subjects get more study blocks when the timetable is rebuilt.</p>
                </>
              ) : (
                <p className="muted">Nothing below 85% this week. 🎉</p>
              )}
            </Tile>
            <Tile className="section-tile">
              <h2>📊 Last 6 weeks</h2>
              <HistoryChart history={data.history} />
            </Tile>
          </div>

          <div className="two-col">
            <Tile className="section-tile">
              <h2>📚 Overall by subject (last 5 results)</h2>
              <ul className="subject-status-list">
                {data.overall.map((o) => (
                  <li key={o.subject}>
                    <SubjectChip subject={o.subject} small />
                    <Meter value={o.average} label={SUBJECTS[o.subject].label} />
                    <StatusBadge status={o.status} percent={o.average} />
                  </li>
                ))}
              </ul>
            </Tile>
            <Tile className="section-tile">
              <h2>🕑 Recent results</h2>
              {data.recent.length === 0 && <p className="muted">No results yet.</p>}
              <ul className="recent-list">
                {data.recent.map((r) => (
                  <li key={r.id}>
                    <span>{KIND_LABEL[r.kind]}</span>
                    <span>{r.label}</span>
                    <StatusBadge status={r.status} percent={r.score} />
                    <span className="muted small">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </Tile>
          </div>
          <p className="muted small legend">🟢 Green: 95% and above · 🟠 Amber: 85–94% · 🔴 Red: below 85%</p>
        </>
      )}
    </>
  );
}
