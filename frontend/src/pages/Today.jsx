// Daily view: timeline of school, activities and study blocks + daily habits checklist (FR6).
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Checkbox, InlineNotification, Tile } from '@carbon/react';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, EmptyState, ErrorNote, Meter, PageTitle, StatusBadge } from '../components/common.jsx';
import { SUBJECTS, addDays, greeting, prettyDate, prettyTime, todayStr } from '../utils.js';

export default function Today() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [date, setDate] = useState(todayStr());
  const [welcome, setWelcome] = useState(location.state?.welcome ?? null);
  const [actionError, setActionError] = useState(null);
  const isToday = date === todayStr();
  const isFuture = date > todayStr();

  const agenda = useLoad(() => studentApi(`/agenda?date=${date}`), [studentApi, date, studentId]);
  const week = useLoad(() => studentApi('/achievements'), [studentApi, studentId]);

  const toggleBlock = async (block, completed) => {
    agenda.setData((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === block.id ? { ...b, completed } : b)) }));
    try {
      await studentApi(`/schedule/blocks/${block.id}`, { method: 'PATCH', body: { completed } });
      week.reload();
    } catch (e) {
      setActionError(e.message);
      agenda.reload();
    }
  };

  const toggleHabit = async (habit, completed) => {
    agenda.setData((d) => ({ ...d, habits: d.habits.map((h) => (h.id === habit.id ? { ...h, completed } : h)) }));
    try {
      await studentApi(`/habits/${habit.id}/log`, { method: 'POST', body: { date, completed } });
      week.reload();
    } catch (e) {
      setActionError(e.message);
      agenda.reload();
    }
  };

  const items = agenda.data
    ? [
        ...agenda.data.commitments.map((c) => ({ kind: 'commitment', key: `c-${c.id}`, start: c.startTime, end: c.endTime, data: c })),
        ...agenda.data.blocks.map((b) => ({ kind: 'block', key: `b-${b.id}`, start: b.startTime, end: b.endTime, data: b })),
      ].sort((a, b) => a.start.localeCompare(b.start))
    : [];
  const doneCount = agenda.data ? agenda.data.blocks.filter((b) => b.completed).length + agenda.data.habits.filter((h) => h.completed).length : 0;
  const totalCount = agenda.data ? agenda.data.blocks.length + agenda.data.habits.length : 0;
  const summary = week.data?.summary;

  return (
    <>
      <PageTitle
        emoji="☀️"
        title={isStudent ? `${greeting()}, ${studentName}!` : `${studentName}'s day`}
        subtitle={prettyDate(date)}
      >
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} iconDescription="Previous day" onClick={() => setDate(addDays(date, -1))} />
        {!isToday && (
          <Button kind="ghost" size="sm" onClick={() => setDate(todayStr())}>
            Today
          </Button>
        )}
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} iconDescription="Next day" onClick={() => setDate(addDays(date, 1))} />
      </PageTitle>

      {welcome !== null && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Your timetable is ready! 🎉"
          subtitle={`Vidya scheduled ${welcome} study blocks this week around your school and activities.`}
          onClose={() => setWelcome(null)}
          className="note"
        />
      )}
      <ErrorNote error={agenda.error || actionError} onClose={actionError ? () => setActionError(null) : undefined} />

      <div className="two-col">
        <div>
          <Tile className="section-tile">
            <h2>🗓️ Schedule</h2>
            {agenda.loading && !agenda.data && <Busy />}
            {agenda.data && items.length === 0 && (
              <EmptyState emoji="🌈" title="Free day!">
                <p>No school, activities or study blocks today.</p>
              </EmptyState>
            )}
            <ol className="timeline">
              {items.map((it) =>
                it.kind === 'commitment' ? (
                  <li key={it.key} className={`timeline__item timeline__item--${it.data.kind.toLowerCase()}`}>
                    <span className="timeline__time">
                      {prettyTime(it.start)} – {prettyTime(it.end)}
                    </span>
                    <span className="timeline__title">
                      {it.data.kind === 'SCHOOL' ? '🏫' : it.data.kind === 'ACTIVITY' ? '🥋' : '📌'} {it.data.name}
                    </span>
                  </li>
                ) : (
                  <li key={it.key} className={`timeline__item timeline__item--study ${it.data.completed ? 'is-done' : ''}`} style={{ '--subject-color': SUBJECTS[it.data.subject].color }}>
                    <span className="timeline__time">
                      {prettyTime(it.start)} – {prettyTime(it.end)}
                    </span>
                    <span className="timeline__title">
                      <Checkbox
                        id={`block-${it.data.id}`}
                        labelText={`${SUBJECTS[it.data.subject].emoji} Study ${SUBJECTS[it.data.subject].label}${it.data.topic ? ` – ${it.data.topic}` : ''}`}
                        checked={it.data.completed}
                        disabled={isFuture}
                        onChange={(_, { checked }) => toggleBlock(it.data, checked)}
                      />
                    </span>
                    {isStudent && !it.data.completed && !isFuture && (
                      <Button kind="ghost" size="sm" onClick={() => navigate(`/practice?subject=${it.data.subject}`)}>
                        Practise now ✏️
                      </Button>
                    )}
                  </li>
                ),
              )}
            </ol>
          </Tile>
        </div>
        <div>
          <Tile className="section-tile">
            <h2>✅ Daily habits</h2>
            {agenda.data && agenda.data.habits.length === 0 && <p className="muted">No daily habits yet.</p>}
            <ul className="habit-list">
              {agenda.data?.habits.map((h) => (
                <li key={h.id} className={h.completed ? 'is-done' : ''}>
                  <Checkbox
                    id={`habit-${h.id}`}
                    labelText={`${h.name} – ${h.minutes} min`}
                    checked={h.completed}
                    disabled={isFuture}
                    onChange={(_, { checked }) => toggleHabit(h, checked)}
                  />
                  {h.completed && <span aria-hidden>⭐</span>}
                </li>
              ))}
            </ul>
            {totalCount > 0 && (
              <div className="day-progress">
                <p>
                  {doneCount} of {totalCount} done {doneCount === totalCount ? '— amazing! 🎉' : ''}
                </p>
                <Meter value={(doneCount / totalCount) * 100} label="Today's progress" />
              </div>
            )}
          </Tile>
          {summary && (
            <Tile className="section-tile">
              <h2>🏆 This week</h2>
              <div className="mini-stat">
                <span>📖 Academic</span>
                <StatusBadge status={summary.academic.status} percent={summary.academic.percent} />
              </div>
              <div className="mini-stat">
                <span>🏃 Activities</span>
                <StatusBadge status={summary.activity.status} percent={summary.activity.percent} />
              </div>
              <Button kind="ghost" size="sm" onClick={() => navigate('/progress')}>
                See all achievements →
              </Button>
            </Tile>
          )}
        </div>
      </div>
    </>
  );
}
