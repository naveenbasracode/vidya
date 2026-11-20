// Manage the 3-year exam bank (FR15): 4 exams per grade; edit title, duration and questions.
import { useState } from 'react';
import { Button, InlineNotification, Modal, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, TextArea, TextInput, Tile, Toggle } from '@carbon/react';
import { Edit, Renew } from '@carbon/icons-react';
import { api } from '../../api.js';
import { useLoad } from '../../hooks.js';
import { Busy, ErrorNote, PageTitle, SubjectChip } from '../../components/common.jsx';

const EXAMPLE = `[
  { "type": "mcq", "prompt": "Which is a noun?", "options": ["run", "dog", "blue"], "answer": "dog", "explanation": "A noun names a thing." },
  { "type": "number", "prompt": "What is 12 × 3?", "answer": 36 },
  { "type": "text", "prompt": "Next letter: A, C, E, ?", "answer": "G" },
  { "type": "essay", "prompt": "Describe your favourite place.", "minWords": 120, "keywords": ["place", "because"] }
]`;

function EditExam({ exam, onClose, onSaved }) {
  const [title, setTitle] = useState(exam.title);
  const [duration, setDuration] = useState(String(exam.durationMinutes));
  const [active, setActive] = useState(exam.active);
  const [json, setJson] = useState(JSON.stringify(exam.questions, null, 2));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    let questions;
    try {
      questions = JSON.parse(json);
    } catch (e) {
      return setError(`Questions are not valid JSON: ${e.message}`);
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/exams/${exam.id}`, { method: 'PUT', body: { title, durationMinutes: Number(duration), active, questions } });
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open size="lg" modalHeading={`Edit: ${exam.title}`} primaryButtonText={busy ? 'Saving…' : 'Save'} secondaryButtonText="Cancel" primaryButtonDisabled={busy} onRequestClose={onClose} onRequestSubmit={save}>
      <Stack gap={5}>
        <ErrorNote error={error} />
        <TextInput id="ex-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="inline-fields">
          <TextInput id="ex-dur" type="number" labelText="Duration (minutes)" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <Toggle id="ex-active" labelText="Visible to students" toggled={active} onToggle={setActive} />
        </div>
        <TextArea id="ex-json" labelText="Questions (JSON)" helperText="Types: mcq (options + answer), number, text, essay (minWords, keywords)." rows={18} value={json} onChange={(e) => setJson(e.target.value)} className="mono" />
        <details>
          <summary>Question format example</summary>
          <pre className="mono small">{EXAMPLE}</pre>
        </details>
      </Stack>
    </Modal>
  );
}

export default function AdminExams() {
  const [tab, setTab] = useState(0);
  const grade = [5, 6, 7][tab];
  const { data, error, loading, reload } = useLoad(() => api(`/admin/exams?grade=${grade}`), [grade]);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const regenerate = async (exam) => {
    if (!window.confirm(`Replace all questions in “${exam.title}” with a new set from the curriculum?`)) return;
    try {
      await api(`/admin/exams/${exam.id}/regenerate`, { method: 'POST', body: {} });
      setMsg(`New questions generated for ${exam.title}.`);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <PageTitle emoji="🗂️" title="Exam bank" subtitle="Four 45-minute exams per grade, one per subject. Edit questions or generate a fresh set." />
      <ErrorNote error={error || err} onClose={err ? () => setErr(null) : undefined} />
      {msg && <InlineNotification kind="success" lowContrast title={msg} onClose={() => setMsg(null)} className="note" />}
      <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex)}>
        <TabList aria-label="Grades">
          <Tab>Grade 5</Tab>
          <Tab>Grade 6</Tab>
          <Tab>Grade 7</Tab>
        </TabList>
        <TabPanels>
          {[5, 6, 7].map((g) => (
            <TabPanel key={g}>
              {loading && !data && <Busy />}
              {grade === g && (
                <div className="exam-grid">
                  {data?.exams.map((e) => (
                    <Tile key={e.id} className="exam-card">
                      <SubjectChip subject={e.subject} small />
                      <h2>{e.title}</h2>
                      <p className="muted">
                        ⏱️ {e.durationMinutes} min · {e.questions.length} questions · {e.attemptCount} attempts {e.active ? '' : '· hidden'}
                      </p>
                      <div className="button-row">
                        <Button size="sm" renderIcon={Edit} onClick={() => setEditing(e)}>
                          Edit
                        </Button>
                        <Button size="sm" kind="ghost" renderIcon={Renew} onClick={() => regenerate(e)}>
                          New questions
                        </Button>
                      </div>
                    </Tile>
                  ))}
                </div>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      {editing && (
        <EditExam
          exam={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMsg('Exam saved.');
            reload();
          }}
        />
      )}
    </>
  );
}
