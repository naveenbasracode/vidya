import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, PageTitle, StatusBadge } from '../components/common.jsx';
import { statusFor } from '../utils.js';

export default function Exams() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => studentApi('/exams'), [studentApi, studentId]);
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <PageTitle
        emoji="📝"
        title={isStudent ? 'Exams' : `${studentName}'s exams`}
        subtitle={data ? `Grade ${data.grade} · ${data.exams.length} exams · 45 minutes each. The timer starts when you press Start and the exam is submitted automatically when time runs out.` : undefined}
      />
      <ErrorNote error={error} />
      {loading && !data && <Busy />}
      <div className="exam-grid">
        {data?.exams.map((e) => (
          <Tile key={e.id} className="exam-card" style={{ '--subject-color': e.color }}>
            <div className="exam-card__emoji" aria-hidden>
              {e.emoji}
            </div>
            <h2>{e.title}</h2>
            <p className="muted">
              ⏱️ {e.durationMinutes} minutes · {e.questionCount} questions
            </p>
            <p>
              Best: <StatusBadge status={statusFor(e.bestScore)} percent={e.bestScore} />
            </p>
            {e.attempts.length > 0 && (
              <ul className="attempt-list">
                {e.attempts.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <button type="button" className="link-button" onClick={() => navigate(`/exams/result/${a.id}`)}>
                      {new Date(a.submittedAt).toLocaleDateString()} – {Math.round(a.score)}%{a.timedOut ? ' (late)' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isStudent && (
              <Button onClick={() => (e.inProgressAttemptId ? navigate(`/exams/take/${e.id}`) : setConfirm(e))} kind={e.inProgressAttemptId ? 'secondary' : 'primary'}>
                {e.inProgressAttemptId ? '▶ Resume exam' : e.attempts.length ? 'Try again' : 'Start exam'}
              </Button>
            )}
          </Tile>
        ))}
      </div>
      <Modal
        open={!!confirm}
        modalHeading={confirm ? `Ready for ${confirm.title}?` : ''}
        primaryButtonText="Start the clock ⏱️"
        secondaryButtonText="Not yet"
        onRequestClose={() => setConfirm(null)}
        onRequestSubmit={() => navigate(`/exams/take/${confirm.id}`)}
      >
        <p>You will have {confirm?.durationMinutes} minutes. Find a quiet place, and have some paper for working out. Good luck! 🍀</p>
      </Modal>
    </>
  );
}
