import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Modal } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle, SubjectChip } from '../components/common.jsx';
import { QuestionList, Results } from '../components/Questions.jsx';

export default function PracticeSet() {
  const { setId } = useParams();
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const { data, setData, error, loading } = useLoad(() => studentApi(`/practice/${setId}`), [studentApi, setId, studentId]);
  const [answers, setAnswers] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (loading && !data) return <Busy />;
  if (error) return <ErrorNote error={error} />;
  const set = data.set;
  const unanswered = set.questions.filter((q) => answers[q.id] === undefined || String(answers[q.id]).trim() === '').length;

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    setSubmitError(null);
    try {
      const r = await studentApi(`/practice/${set.id}/submit`, { method: 'POST', body: { answers } });
      setData(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle emoji={set.topic === 'essay-writing' ? '🖊️' : '✏️'} title={set.topicName} subtitle={set.source === 'document' ? 'Questions made from your uploaded PDF' : undefined}>
        <SubjectChip subject={set.subject} />
      </PageTitle>
      <ErrorNote error={submitError} onClose={() => setSubmitError(null)} />
      {set.submittedAt ? (
        <>
          <Results result={set.result} questions={set.questions} />
          <div className="button-row">
            <Button onClick={() => navigate(`/practice?subject=${set.subject}`)}>More practice</Button>
          </div>
        </>
      ) : isStudent ? (
        <>
          <QuestionList questions={set.questions} answers={answers} onChange={setAnswers} disabled={busy} />
          <div className="button-row sticky-actions">
            <Button onClick={() => (unanswered ? setConfirm(true) : submit())} disabled={busy}>
              {busy ? 'Marking…' : 'Check my answers ✔'}
            </Button>
            <span className="muted">
              {set.questions.length - unanswered} of {set.questions.length} answered
            </span>
          </div>
          <Modal
            open={confirm}
            modalHeading="Some questions are blank"
            primaryButtonText="Submit anyway"
            secondaryButtonText="Keep going"
            onRequestClose={() => setConfirm(false)}
            onRequestSubmit={submit}
          >
            <p>
              You have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}. Blank answers are marked as incorrect.
            </p>
          </Modal>
        </>
      ) : (
        <p className="muted">
          Waiting for {studentName} to complete this set ({set.questions.length} questions). Results will appear here.
        </p>
      )}
    </>
  );
}
