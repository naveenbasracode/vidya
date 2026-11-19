// "Tell us about your week": school hours and co-curricular activities (FR2).
// Shown to students on first login, and to students/parents later to edit activities.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, InlineNotification, Select, SelectItem, TextInput, Tile } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';
import { useAuth } from '../context/auth.jsx';
import { useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle } from '../components/common.jsx';
import { DAY_NAMES, todayStr, toMinutes } from '../utils.js';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const defaultSchool = () => WEEKDAYS.map((d) => ({ day: d, on: d >= 1 && d <= 5, start: '08:30', end: '15:30' }));
const blankActivity = () => ({ kind: 'ACTIVITY', name: '', dayOfWeek: 3, startTime: '18:00', endTime: '19:00', practiceMinutes: '15' });

export default function Onboarding() {
  const { user, isStudent, studentId, studentName, setUser, selectedChild, refreshChildren } = useAuth();
  const childNeedsSetup = !isStudent && selectedChild && !selectedChild.onboarded;
  const { studentApi } = useStudentApi();
  const navigate = useNavigate();
  const firstTime = isStudent && !user.onboarded;
  const [school, setSchool] = useState(defaultSchool);
  const [activities, setActivities] = useState(firstTime ? [blankActivity()] : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    studentApi('/commitments')
      .then(({ commitments }) => {
        if (commitments.length) {
          const s = defaultSchool().map((row) => {
            const c = commitments.find((x) => x.kind === 'SCHOOL' && x.dayOfWeek === row.day);
            return c ? { day: row.day, on: true, start: c.startTime, end: c.endTime } : { ...row, on: false };
          });
          setSchool(s);
          setActivities(
            commitments
              .filter((c) => c.kind !== 'SCHOOL')
              .map((c) => ({ ...c, practiceMinutes: c.practiceMinutes === null || c.practiceMinutes === undefined ? '' : String(c.practiceMinutes) })),
          );
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studentId, studentApi]);

  if (!studentId) {
    return (
      <>
        <PageTitle emoji="🥋" title="Activities" />
        <p>
          Add or select a child on the <Link to="/family">Family</Link> page first.
        </p>
      </>
    );
  }

  const updateSchool = (i, patch) => setSchool((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const updateActivity = (i, patch) => setActivities((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const validate = () => {
    for (const r of school.filter((x) => x.on)) {
      if (!r.start || !r.end || toMinutes(r.end) <= toMinutes(r.start)) return `School on ${DAY_NAMES[r.day]}: end time must be after start time.`;
    }
    for (const a of activities) {
      if (!a.name.trim()) return 'Every activity needs a name (or remove the empty row).';
      if (!a.startTime || !a.endTime || toMinutes(a.endTime) <= toMinutes(a.startTime)) return `${a.name}: end time must be after start time.`;
    }
    return null;
  };

  const save = async (rebuild) => {
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const commitments = [
        ...school.filter((r) => r.on).map((r) => ({ kind: 'SCHOOL', name: 'School', dayOfWeek: r.day, startTime: r.start, endTime: r.end })),
        ...activities.map((a) => ({
          kind: a.kind,
          name: a.name.trim(),
          dayOfWeek: Number(a.dayOfWeek),
          startTime: a.startTime,
          endTime: a.endTime,
          practiceMinutes: a.kind === 'ACTIVITY' && a.practiceMinutes !== '' ? Number(a.practiceMinutes) : null,
        })),
      ];
      await studentApi('/commitments', { method: 'PUT', body: { commitments } });
      if (firstTime) {
        const res = await studentApi('', { method: 'PATCH', body: { onboarded: true, today: todayStr() } });
        setUser((u) => ({ ...u, onboarded: true }));
        navigate('/', { replace: true, state: { welcome: res.schedule?.blocks?.length ?? 0 } });
        return;
      }
      if (childNeedsSetup) {
        const res = await studentApi('', { method: 'PATCH', body: { onboarded: true, today: todayStr() } });
        await refreshChildren();
        setSaved(`Saved! ${studentName}'s timetable is ready with ${res.schedule?.blocks?.length ?? 0} study blocks this week.`);
      } else if (rebuild) {
        const r = await studentApi('/schedule/generate', { method: 'POST', body: { today: todayStr() } });
        setSaved(`Saved! This week's timetable was rebuilt with ${r.generated} study blocks.`);
      } else setSaved('Saved!');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Busy />;

  return (
    <>
      <PageTitle
        emoji={firstTime ? '👋' : '🥋'}
        title={firstTime ? `Hi ${user.name}! Tell us about your week` : `${isStudent ? 'My' : `${studentName}'s`} school & activities`}
        subtitle="Vidya builds a study timetable around these, so nothing clashes. Days with an activity are kept free of study (you can change this in My Week → Preferences)."
      />
      <ErrorNote error={error} onClose={() => setError(null)} />
      {saved && <InlineNotification kind="success" title={saved} lowContrast onClose={() => setSaved(null)} className="note" />}

      <Tile className="section-tile">
        <h2>🏫 School timings</h2>
        <div className="school-grid">
          {school.map((r, i) => (
            <div key={r.day} className={`school-row ${r.on ? '' : 'is-off'}`}>
              <Checkbox id={`school-${r.day}`} labelText={DAY_NAMES[r.day]} checked={r.on} onChange={(_, { checked }) => updateSchool(i, { on: checked })} />
              <TextInput id={`school-start-${r.day}`} type="time" labelText="Starts" size="sm" value={r.start} disabled={!r.on} onChange={(e) => updateSchool(i, { start: e.target.value })} />
              <TextInput id={`school-end-${r.day}`} type="time" labelText="Ends" size="sm" value={r.end} disabled={!r.on} onChange={(e) => updateSchool(i, { end: e.target.value })} />
            </div>
          ))}
        </div>
      </Tile>

      <Tile className="section-tile">
        <h2>🥁 Co-curricular activities & other commitments</h2>
        <p className="muted">
          e.g. Drum class on Wednesday 6:00–7:00 pm. Add “daily practice” minutes and Vidya will add a daily practice habit (like “Drums practice – 15 min”).
        </p>
        {activities.length === 0 && <p className="muted">No activities yet.</p>}
        {activities.map((a, i) => (
          <div key={i} className="activity-row">
            <TextInput id={`act-name-${i}`} labelText="Activity" placeholder="Karate" value={a.name} onChange={(e) => updateActivity(i, { name: e.target.value })} />
            <Select id={`act-kind-${i}`} labelText="Type" value={a.kind} onChange={(e) => updateActivity(i, { kind: e.target.value })}>
              <SelectItem value="ACTIVITY" text="Activity / class" />
              <SelectItem value="OTHER" text="Other commitment" />
            </Select>
            <Select id={`act-day-${i}`} labelText="Day" value={String(a.dayOfWeek)} onChange={(e) => updateActivity(i, { dayOfWeek: Number(e.target.value) })}>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d} value={String(d)} text={DAY_NAMES[d]} />
              ))}
            </Select>
            <TextInput id={`act-start-${i}`} type="time" labelText="From" value={a.startTime} onChange={(e) => updateActivity(i, { startTime: e.target.value })} />
            <TextInput id={`act-end-${i}`} type="time" labelText="To" value={a.endTime} onChange={(e) => updateActivity(i, { endTime: e.target.value })} />
            <TextInput
              id={`act-practice-${i}`}
              type="number"
              min={0}
              max={180}
              labelText="Daily practice (min)"
              disabled={a.kind !== 'ACTIVITY'}
              value={a.practiceMinutes}
              onChange={(e) => updateActivity(i, { practiceMinutes: e.target.value })}
            />
            <Button
              kind="ghost"
              hasIconOnly
              renderIcon={TrashCan}
              iconDescription="Remove"
              tooltipPosition="left"
              onClick={() => setActivities((rows) => rows.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <Button kind="tertiary" size="sm" renderIcon={Add} onClick={() => setActivities((rows) => [...rows, blankActivity()])}>
          Add activity
        </Button>
      </Tile>

      <div className="button-row">
        {firstTime ? (
          <Button onClick={() => save(false)} disabled={busy}>
            {busy ? 'Building your timetable…' : '🚀 Save & build my timetable'}
          </Button>
        ) : (
          <>
            <Button onClick={() => save(true)} disabled={busy}>
              {busy ? 'Saving…' : 'Save & rebuild this week'}
            </Button>
            <Button kind="secondary" onClick={() => save(false)} disabled={busy}>
              Save only
            </Button>
          </>
        )}
      </div>
    </>
  );
}
