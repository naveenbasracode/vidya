// A timed exam (FR10). The server sets the deadline; answers are saved locally so a refresh doesn't lose work.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Modal } from '@carbon/react';
import { useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle, SubjectChip } from '../components/common.jsx';
import { QuestionList } from '../components/Questions.jsx';

const storageKey = (attemptId) => `vidya.exam.${attemptId}`;
const loadAnswers = (attemptId) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(attemptId)) || '{}');
  } catch {
    return {};
  }
};

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function ExamTake() {
  const { examId } = useParams();
  const { studentApi } = useStudentApi();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Start (or resume) the exam exactly once, even when React runs effects twice in development.
  const startRequest = useRef(null);
  useEffect(() => {
    if (!startRequest.current) startRequest.current = studentApi(`/exams/${examId}/start`, { method: 'POST', body: {} });
    let cancelled = false;
    startRequest.current
      .then((s) => {
        if (cancelled) return;
        // correct for any difference between this computer's clock and the server's
        const offset = Date.now() - new Date(s.attempt.serverNow).getTime();
        setSession({ ...s, deadlineLocal: new Date(s.attempt.deadline).getTime() + offset });
        setAnswers(loadAnswers(s.attempt.id));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [examId, studentApi]);

  const submit = useCallback(
    async (auto = false) => {
      if (!session || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirm(false);
      try {
        const r = await studentApi(`/exams/attempts/${session.attempt.id}/submit`, { method: 'POST', body: { answers: answersRef.current } });
        try {
          localStorage.removeItem(storageKey(session.attempt.id));
        } catch {
          /* ignore */
        }
        navigate(`/exams/result/${r.attempt.id}`, { replace: true, state: { auto } });
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(e.message);
      }
    },
    [session, studentApi, navigate],
  );

  // Countdown + auto-submit at zero
  useEffect(() => {
    if (!session) return undefined;
    const tick = () => {
      const left = session.deadlineLocal - Date.now();
      setRemaining(left);
      if (left <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, submit]);

  // Save answers locally as the student types
  useEffect(() => {
    if (!session) return;
    try {
      localStorage.setItem(storageKey(session.attempt.id), JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, session]);

  // Warn before closing the tab mid-exam
  useEffect(() => {
    const handler = (e) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  if (error && !session) return <ErrorNote error={error} />;
  if (!session) return <Busy text="Preparing your exam…" />;

  const total = session.exam.questions.length;
  const answered = session.exam.questions.filter((q) => answers[q.id] !== undefined && String(answers[q.id]).trim() !== '').length;
  const low = remaining !== null && remaining < 5 * 60_000;

  return (
    <>
      <div className={`exam-timer ${low ? 'exam-timer--low' : ''}`} role="timer" aria-live={low ? 'assertive' : 'off'}>
        ⏱️ {remaining === null ? '--:--' : fmt(remaining)} <span className="exam-timer__meta">left · {answered}/{total} answered</span>
      </div>
      <PageTitle emoji="📝" title={session.exam.title} subtitle={`${session.exam.durationMinutes} minutes · ${total} questions`}>
        <SubjectChip subject={session.exam.subject} />
      </PageTitle>
      <ErrorNote error={error} onClose={() => setError(null)} />
      <QuestionList questions={session.exam.questions} answers={answers} onChange={setAnswers} disabled={submitting} />
      <div className="button-row sticky-actions">
        <Button onClick={() => setConfirm(true)} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Finish & submit'}
        </Button>
        <span className="muted">
          {answered} of {total} answered
        </span>
      </div>
      <Modal
        open={confirm}
        modalHeading="Submit your exam?"
        primaryButtonText="Submit"
        secondaryButtonText="Keep working"
        onRequestClose={() => setConfirm(false)}
        onRequestSubmit={() => submit(false)}
      >
        <p>
          You have answered {answered} of {total} questions{remaining ? ` and still have ${fmt(remaining)} left` : ''}. You can't change answers after submitting.
        </p>
      </Modal>
    </>
  );
}
