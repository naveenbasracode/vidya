import { RadioButton, RadioButtonGroup, TextArea, TextInput, Tile } from '@carbon/react';
import { StatusBadge } from './common.jsx';
import { statusFor } from '../utils.js';

const wordCount = (s) => (s?.match(/[A-Za-z']+/g) ?? []).length;

/** Renders a list of questions and collects answers into `answers` ({ [id]: value }). */
export function QuestionList({ questions, answers, onChange, disabled }) {
  const set = (id, v) => onChange({ ...answers, [id]: v });
  return (
    <ol className="question-list">
      {questions.map((q, i) => (
        <li key={q.id}>
          <Tile className="question">
            <p className="question__prompt">
              <span className="question__num">{i + 1}</span> {q.prompt}
            </p>
            {q.type === 'mcq' && (
              <RadioButtonGroup
                legendText="Choose one answer"
                name={`q-${q.id}`}
                orientation="vertical"
                valueSelected={answers[q.id] ?? ''}
                onChange={(v) => set(q.id, v)}
                disabled={disabled}
              >
                {q.options.map((o, j) => (
                  <RadioButton key={j} id={`q-${q.id}-${j}`} labelText={o} value={o} />
                ))}
              </RadioButtonGroup>
            )}
            {(q.type === 'number' || q.type === 'text') && (
              <TextInput
                id={`q-${q.id}`}
                labelText="Your answer"
                inputMode={q.type === 'number' ? 'decimal' : 'text'}
                autoComplete="off"
                value={answers[q.id] ?? ''}
                onChange={(e) => set(q.id, e.target.value)}
                disabled={disabled}
                className="answer-input"
              />
            )}
            {q.type === 'essay' && (
              <>
                <TextArea
                  id={`q-${q.id}`}
                  labelText={`Your writing (aim for at least ${q.minWords ?? 120} words)`}
                  rows={14}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  disabled={disabled}
                />
                <p className="muted small">
                  {wordCount(answers[q.id])} words · Tip: use paragraphs — an introduction, body and conclusion.
                </p>
              </>
            )}
          </Tile>
        </li>
      ))}
    </ol>
  );
}

/** Graded results: score banner + per-question feedback. `questions` may include answers (exam review). */
export function Results({ result, questions }) {
  if (!result) return null;
  const status = statusFor(result.score);
  const cheer = status === 'GREEN' ? 'Fantastic! 🌟' : status === 'AMBER' ? 'Great work — almost there! 💪' : 'Good try! Practice makes progress 🌱';
  return (
    <>
      <Tile className={`score-banner score-banner--${(status ?? 'none').toLowerCase()}`}>
        <div className="score-banner__score">{Math.round(result.score)}%</div>
        <div>
          <h2>{cheer}</h2>
          <p>
            {result.correctCount} of {result.total} correct · <StatusBadge status={status} />
          </p>
        </div>
      </Tile>
      <ol className="question-list">
        {questions.map((q, i) => {
          const r = result.results.find((x) => x.id === q.id);
          if (!r) return null;
          return (
            <li key={q.id}>
              <Tile className={`question question--${q.type === 'essay' ? 'essay' : r.correct ? 'right' : 'wrong'}`}>
                <p className="question__prompt">
                  <span className="question__num">{i + 1}</span> {q.prompt}
                </p>
                {q.type === 'essay' ? (
                  <>
                    <p>
                      <strong>Essay score: {r.score}/100</strong>
                    </p>
                    <ul className="feedback-list">
                      {r.feedback?.map((f, j) => (
                        <li key={j}>{f}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      {r.correct ? '✅' : '❌'} Your answer: <strong>{r.given || '—'}</strong>
                    </p>
                    {!r.correct && (
                      <p>
                        Correct answer: <strong>{r.expected}</strong>
                      </p>
                    )}
                    {r.explanation && <p className="muted">💡 {r.explanation}</p>}
                  </>
                )}
              </Tile>
            </li>
          );
        })}
      </ol>
    </>
  );
}
