import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, InlineNotification } from '@carbon/react';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle, SubjectChip } from '../components/common.jsx';
import { Results } from '../components/Questions.jsx';

export default function ExamResult() {
  const { attemptId } = useParams();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, error, loading } = useLoad(() => studentApi(`/exams/attempts/${attemptId}`), [studentApi, attemptId, studentId]);

  if (loading && !data) return <Busy />;
  if (error) return <ErrorNote error={error} />;
  return (
    <>
      <PageTitle emoji="🏁" title={data.exam.title} subtitle={`Submitted ${new Date(data.attempt.submittedAt).toLocaleString()}`}>
        <SubjectChip subject={data.exam.subject} />
      </PageTitle>
      {location.state?.auto && <InlineNotification kind="info" lowContrast title="Time's up!" subtitle="Your exam was submitted automatically." className="note" />}
      {data.attempt.timedOut && <InlineNotification kind="warning" lowContrast title="Submitted after the 45 minutes" subtitle="This attempt was handed in late." className="note" hideCloseButton />}
      <Results result={data.result} questions={data.questions} />
      <div className="button-row">
        <Button onClick={() => navigate('/exams')}>Back to exams</Button>
        <Button kind="secondary" onClick={() => navigate(`/practice?subject=${data.exam.subject}`)}>
          Practise this subject
        </Button>
      </div>
    </>
  );
}
