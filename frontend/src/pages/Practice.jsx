// Choose a subject & topic and generate practice (FR8, FR9). Parents can assign practice to their child.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, RadioButton, RadioButtonGroup, Select, SelectItem, Stack, TextInput, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, EmptyState, ErrorNote, PageTitle, StatusBadge, SubjectChip } from '../components/common.jsx';
import { SUBJECTS, statusFor } from '../utils.js';

export default function Practice() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const subject = params.get('subject');
  const [source, setSource] = useState('curriculum');
  const [documentId, setDocumentId] = useState('');
  const [topicText, setTopicText] = useState('');
  const [count, setCount] = useState('10');
  const [busyTopic, setBusyTopic] = useState(null);
  const [error, setError] = useState(null);

  const topics = useLoad(() => studentApi('/practice/topics'), [studentApi, studentId]);
  const sets = useLoad(() => studentApi('/practice'), [studentApi, studentId]);
  const subj = useMemo(() => topics.data?.subjects.find((s) => s.subject === subject), [topics.data, subject]);

  const generate = async (body, key) => {
    setBusyTopic(key);
    setError(null);
    try {
      const { set } = await studentApi('/practice', { method: 'POST', body: { subject, count: Number(count), ...body } });
      if (isStudent) navigate(`/practice/${set.id}`);
      else sets.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyTopic(null);
    }
  };

  const grade = topics.data?.grade;
  const byGrade = subj ? [5, 6, 7].map((g) => ({ g, topics: subj.topics.filter((t) => t.grade === g) })).filter((x) => x.topics.length) : [];
  const pending = sets.data?.sets.filter((s) => !s.submittedAt) ?? [];
  const done = sets.data?.sets.filter((s) => s.submittedAt) ?? [];

  return (
    <>
      <PageTitle
        emoji="✏️"
        title={isStudent ? 'Practice' : `Assign practice to ${studentName}`}
        subtitle={isStudent ? 'Pick a subject, then a topic. Every set is marked straight away!' : 'Choose a topic — the set will appear in your child’s Practice page.'}
      />
      <ErrorNote error={topics.error || error} onClose={error ? () => setError(null) : undefined} />

      {pending.length > 0 && (
        <Tile className="section-tile">
          <h2>📌 {isStudent ? 'Waiting for you' : 'Assigned, not done yet'}</h2>
          <ul className="set-list">
            {pending.map((s) => (
              <li key={s.id}>
                <SubjectChip subject={s.subject} small /> <span>{s.topicName}</span> <span className="muted small">{s.questionCount} questions</span>
                {s.assigned && <span className="tag-assigned">from parent</span>}
                {isStudent && (
                  <Button size="sm" kind="primary" onClick={() => navigate(`/practice/${s.id}`)}>
                    Start
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Tile>
      )}

      {topics.loading && !topics.data && <Busy />}
      {topics.data && (
        <div className="subject-tiles">
          {topics.data.subjects.map((s) => (
            <button
              type="button"
              key={s.subject}
              className={`subject-tile ${subject === s.subject ? 'is-selected' : ''}`}
              style={{ '--subject-color': s.color }}
              onClick={() => setParams({ subject: s.subject })}
            >
              <span className="subject-tile__emoji" aria-hidden>
                {s.emoji}
              </span>
              <span className="subject-tile__label">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {subj && (
        <Tile className="section-tile">
          <div className="practice-options">
            <RadioButtonGroup legendText="Questions from" name="source" valueSelected={source} onChange={(v) => setSource(v)}>
              <RadioButton id="src-cur" labelText="📘 Vidya curriculum" value="curriculum" />
              <RadioButton id="src-doc" labelText={`📄 Uploaded PDF (${subj.documents.length})`} value="document" disabled={!subj.documents.length} />
            </RadioButtonGroup>
            <Select id="count" labelText="Number of questions" value={count} onChange={(e) => setCount(e.target.value)} size="sm">
              {['5', '10', '15', '20'].map((n) => (
                <SelectItem key={n} value={n} text={n} />
              ))}
            </Select>
          </div>

          {source === 'curriculum' ? (
            <>
              <div className="topic-row">
                <Button size="md" disabled={!!busyTopic} onClick={() => generate({ topicId: 'mixed' }, 'mixed')}>
                  {busyTopic === 'mixed' ? 'Making questions…' : `🎲 Mixed ${SUBJECTS[subject].label} (Grade ${grade} level)`}
                </Button>
              </div>
              {byGrade.map(({ g, topics: list }) => (
                <div key={g} className="topic-group">
                  <h3>
                    Grade {g} {g === grade ? '⭐ your grade' : ''}
                  </h3>
                  <div className="topic-buttons">
                    {list.map((t) => (
                      <Button key={t.id} kind={g === grade ? 'tertiary' : 'ghost'} size="sm" disabled={!!busyTopic} onClick={() => generate({ topicId: t.id }, t.id)}>
                        {busyTopic === t.id ? 'Making…' : `${t.id === 'essay-writing' ? '🖊️ ' : ''}${t.name}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <Stack gap={5} className="doc-form">
              <Select id="doc" labelText="PDF" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
                <SelectItem value="" text="Choose a PDF…" />
                {subj.documents.map((d) => (
                  <SelectItem key={d.id} value={d.id} text={`${d.originalName}${d.grade ? ` (Grade ${d.grade})` : ''}`} />
                ))}
              </Select>
              <TextInput
                id="topic-text"
                labelText="Topic"
                placeholder="e.g. Fractions, Multiplication, Similes"
                helperText="Vidya looks for this topic in the PDF and makes questions from it."
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
              />
              <Button disabled={!documentId || !topicText.trim() || !!busyTopic} onClick={() => generate({ source: 'document', documentId, topicText: topicText.trim() }, 'doc')}>
                {busyTopic === 'doc' ? 'Reading the PDF…' : 'Make questions from PDF'}
              </Button>
            </Stack>
          )}
        </Tile>
      )}
      {!subject && topics.data && <p className="muted">👆 Choose a subject to see its topics.</p>}

      <Tile className="section-tile">
        <h2>📈 Recent practice</h2>
        {sets.data && done.length === 0 && (
          <EmptyState emoji="🎯" title="No practice yet">
            <p>Completed practice sets will appear here.</p>
          </EmptyState>
        )}
        <ul className="set-list">
          {done.map((s) => (
            <li key={s.id}>
              <SubjectChip subject={s.subject} small /> <span>{s.topicName}</span>
              <StatusBadge status={statusFor(s.score)} percent={s.score} />
              <span className="muted small">{new Date(s.submittedAt).toLocaleDateString()}</span>
              <Button size="sm" kind="ghost" onClick={() => navigate(`/practice/${s.id}`)}>
                Review
              </Button>
            </li>
          ))}
        </ul>
      </Tile>
    </>
  );
}
