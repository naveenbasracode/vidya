// Weekly timetable with manual override (FR3, FR4, FR5).
import { useState } from 'react';
import { Button, Checkbox, InlineNotification, Modal, Select, SelectItem, Stack, TextInput, Tile, Toggle } from '@carbon/react';
import { Add, ChevronLeft, ChevronRight, Renew, Settings } from '@carbon/icons-react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle, SubjectChip } from '../components/common.jsx';
import { DAY_NAMES, DAY_SHORT, SUBJECTS, SUBJECT_KEYS, addDays, dayOfWeek, fromMinutes, prettyDate, prettyTime, startOfWeek, toMinutes, todayStr } from '../utils.js';

function BlockModal({ open, block, weekDays, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(block);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (!form.startTime || !form.endTime || toMinutes(form.endTime) <= toMinutes(form.startTime)) return setError('End time must be after start time.');
    setBusy(true);
    setError(null);
    try {
      await onSave(form);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      modalHeading={block.id ? 'Edit study block' : 'Add a study block'}
      primaryButtonText={busy ? 'Saving…' : 'Save'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={busy}
      onRequestClose={onClose}
      onRequestSubmit={submit}
    >
      <Stack gap={5}>
        <ErrorNote error={error} />
        <Select id="blk-date" labelText="Day" value={form.date} onChange={set('date')}>
          {weekDays.map((d) => (
            <SelectItem key={d} value={d} text={prettyDate(d, { weekday: 'long', day: 'numeric', month: 'short' })} />
          ))}
        </Select>
        <div className="inline-fields">
          <TextInput id="blk-start" type="time" labelText="Start" value={form.startTime} onChange={set('startTime')} />
          <TextInput id="blk-end" type="time" labelText="End" value={form.endTime} onChange={set('endTime')} />
        </div>
        <Select id="blk-subject" labelText="Subject" value={form.subject} onChange={set('subject')}>
          {SUBJECT_KEYS.map((s) => (
            <SelectItem key={s} value={s} text={`${SUBJECTS[s].emoji} ${SUBJECTS[s].label}`} />
          ))}
        </Select>
        <TextInput id="blk-topic" labelText="Topic (optional)" placeholder="e.g. Fractions" value={form.topic ?? ''} onChange={set('topic')} />
        {block.id && (
          <Button kind="danger--tertiary" size="sm" onClick={() => onDelete(block)}>
            Delete this block
          </Button>
        )}
      </Stack>
    </Modal>
  );
}

function SettingsModal({ open, settings, onClose, onSave }) {
  const [s, setS] = useState(settings);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const setWin = (which, k) => (e) => setS((x) => ({ ...x, [which]: { ...x[which], [k]: e.target.value } }));
  const setNum = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value === '' ? '' : Number(e.target.value) }));
  const toggleDay = (d, on) => setS((x) => ({ ...x, studyDays: on ? [...new Set([...x.studyDays, d])] : x.studyDays.filter((y) => y !== d) }));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(s);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal open modalHeading="Timetable preferences" primaryButtonText={busy ? 'Saving…' : 'Save & rebuild week'} secondaryButtonText="Cancel" primaryButtonDisabled={busy} onRequestClose={onClose} onRequestSubmit={submit}>
      <Stack gap={5}>
        <ErrorNote error={error} />
        <Toggle
          id="skip-activity-days"
          labelText="Keep activity days free of study"
          labelA="Off – study around the activity"
          labelB="On – no study on activity days"
          toggled={s.skipActivityDays}
          onToggle={(v) => setS((x) => ({ ...x, skipActivityDays: v }))}
        />
        <div className="inline-fields">
          <TextInput id="wd-start" type="time" labelText="Weekday study from" value={s.weekdayWindow.start} onChange={setWin('weekdayWindow', 'start')} />
          <TextInput id="wd-end" type="time" labelText="until" value={s.weekdayWindow.end} onChange={setWin('weekdayWindow', 'end')} />
        </div>
        <div className="inline-fields">
          <TextInput id="we-start" type="time" labelText="Weekend study from" value={s.weekendWindow.start} onChange={setWin('weekendWindow', 'start')} />
          <TextInput id="we-end" type="time" labelText="until" value={s.weekendWindow.end} onChange={setWin('weekendWindow', 'end')} />
        </div>
        <div className="inline-fields">
          <TextInput id="blk-min" type="number" labelText="Block length (min)" value={s.blockMinutes} onChange={setNum('blockMinutes')} />
          <TextInput id="brk-min" type="number" labelText="Break between (min)" value={s.breakMinutes} onChange={setNum('breakMinutes')} />
        </div>
        <div className="inline-fields">
          <TextInput id="max-wd" type="number" labelText="Blocks per weekday" value={s.maxBlocksWeekday} onChange={setNum('maxBlocksWeekday')} />
          <TextInput id="max-we" type="number" labelText="Blocks per weekend day" value={s.maxBlocksWeekend} onChange={setNum('maxBlocksWeekend')} />
        </div>
        <fieldset className="day-checks">
          <legend className="cds--label">Study days</legend>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Checkbox key={d} id={`sd-${d}`} labelText={DAY_SHORT[d]} checked={s.studyDays.includes(d)} onChange={(_, { checked }) => toggleDay(d, checked)} />
          ))}
        </fieldset>
      </Stack>
    </Modal>
  );
}

export default function Schedule() {
  const { studentName, isStudent } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayStr()));
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error: loadError, reload } = useLoad(() => studentApi(`/schedule?weekStart=${weekStart}`), [studentApi, weekStart, studentId]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayStr();

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await studentApi('/schedule/generate', { method: 'POST', body: { weekStart, today } });
      const order = r.priorities.map((p) => `${SUBJECTS[p.subject].emoji} ${SUBJECTS[p.subject].label}${p.score !== null ? ` (${Math.round(p.score)}%)` : ''}`).join(' → ');
      setNotice({
        title: `Timetable rebuilt: ${r.generated} study blocks`,
        subtitle: `Priority (weakest first): ${order}.${r.skippedDays.length ? ` Free days: ${r.skippedDays.map((d) => `${DAY_SHORT[dayOfWeek(d.date)]} (${d.reason})`).join('; ')}.` : ''} Your own edits were kept.`,
      });
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveBlock = async (form) => {
    const body = { date: form.date, startTime: form.startTime, endTime: form.endTime, subject: form.subject, topic: form.topic || null };
    const r = form.id
      ? await studentApi(`/schedule/blocks/${form.id}`, { method: 'PATCH', body })
      : await studentApi('/schedule/blocks', { method: 'POST', body });
    setEditing(null);
    setNotice(r.warnings?.length ? { kind: 'warning', title: 'Saved, but please check:', subtitle: r.warnings.join('. ') } : { title: 'Saved ✔', subtitle: 'The change is kept even if the timetable is rebuilt.' });
    reload();
  };

  const deleteBlock = async (block) => {
    try {
      await studentApi(`/schedule/blocks/${block.id}`, { method: 'DELETE' });
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const saveSettings = async (settings) => {
    await studentApi('', { method: 'PATCH', body: { settings, today } });
    setShowSettings(false);
    setNotice({ title: 'Preferences saved and this week rebuilt.' });
    reload();
  };

  const newBlock = (date) => {
    const start = dayOfWeek(date) === 0 || dayOfWeek(date) === 6 ? data?.settings.weekendWindow.start : data?.settings.weekdayWindow.start;
    const s = start ?? '16:00';
    setEditing({ date, startTime: s, endTime: fromMinutes(toMinutes(s) + (data?.settings.blockMinutes ?? 30)), subject: 'MATHS', topic: '' });
  };

  return (
    <>
      <PageTitle emoji="📅" title={isStudent ? 'My week' : `${studentName}'s week`} subtitle={`${prettyDate(days[0], { day: 'numeric', month: 'short' })} – ${prettyDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`}>
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} iconDescription="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} />
        <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} iconDescription="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} />
        <Button kind="secondary" size="sm" renderIcon={Settings} onClick={() => setShowSettings(true)} disabled={!data}>
          Preferences
        </Button>
        <Button kind="primary" size="sm" renderIcon={Renew} onClick={regenerate} disabled={busy || days[6] < today}>
          {busy ? 'Rebuilding…' : 'Rebuild timetable'}
        </Button>
      </PageTitle>
      <ErrorNote error={loadError || error} onClose={error ? () => setError(null) : undefined} />
      {notice && <InlineNotification kind={notice.kind ?? 'success'} lowContrast title={notice.title} subtitle={notice.subtitle} onClose={() => setNotice(null)} className="note" />}
      {loading && !data && <Busy />}
      {data && (
        <div className="week-grid">
          {days.map((d) => {
            const dow = dayOfWeek(d);
            const commitments = data.commitments.filter((c) => c.dayOfWeek === dow);
            const blocks = data.blocks.filter((b) => b.date === d);
            const items = [
              ...commitments.map((c) => ({ type: 'c', start: c.startTime, c })),
              ...blocks.map((b) => ({ type: 'b', start: b.startTime, b })),
            ].sort((a, b) => a.start.localeCompare(b.start));
            return (
              <Tile key={d} className={`week-day ${d === today ? 'is-today' : ''} ${d < today ? 'is-past' : ''}`}>
                <div className="week-day__head">
                  <strong>{DAY_NAMES[dow]}</strong>
                  <span>{prettyDate(d, { day: 'numeric', month: 'short' })}</span>
                </div>
                {items.length === 0 && <p className="muted small">Free 🌈</p>}
                {items.map((it) =>
                  it.type === 'c' ? (
                    <div key={it.c.id} className={`week-item week-item--${it.c.kind.toLowerCase()}`}>
                      <span className="week-item__time">
                        {prettyTime(it.c.startTime)}–{prettyTime(it.c.endTime)}
                      </span>
                      <span>
                        {it.c.kind === 'SCHOOL' ? '🏫' : it.c.kind === 'ACTIVITY' ? '🥋' : '📌'} {it.c.name}
                      </span>
                    </div>
                  ) : (
                    <button
                      key={it.b.id}
                      type="button"
                      className={`week-item week-item--study ${it.b.completed ? 'is-done' : ''}`}
                      style={{ '--subject-color': SUBJECTS[it.b.subject].color }}
                      onClick={() => setEditing(it.b)}
                      title="Click to edit"
                    >
                      <span className="week-item__time">
                        {prettyTime(it.b.startTime)}–{prettyTime(it.b.endTime)} {it.b.completed ? '✅' : ''} {it.b.isManual ? '✏️' : ''}
                      </span>
                      <SubjectChip subject={it.b.subject} small />
                      {it.b.topic && <span className="small">{it.b.topic}</span>}
                    </button>
                  ),
                )}
                <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => newBlock(d)} className="week-day__add">
                  Add
                </Button>
              </Tile>
            );
          })}
        </div>
      )}
      <p className="muted small legend">✏️ = changed by hand (kept when rebuilding) · ✅ = done · Click a study block to move it or change the subject.</p>
      {editing && <BlockModal open block={editing} weekDays={days} onClose={() => setEditing(null)} onSave={saveBlock} onDelete={deleteBlock} />}
      {showSettings && data && <SettingsModal open settings={data.settings} onClose={() => setShowSettings(false)} onSave={saveSettings} />}
    </>
  );
}
