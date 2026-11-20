// 3-year holistic plan, Grades 5-7 (FR14). Topics turn green as they are mastered (85%+).
import { useNavigate } from 'react-router-dom';
import { Button, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, ErrorNote, Meter, PageTitle } from '../components/common.jsx';

const STATE_ICON = { mastered: '✅', 'in-progress': '🟠', 'not-started': '⚪' };
const PHASE = { past: 'Completed year', current: 'This year ⭐', future: 'Coming up' };

export default function Roadmap() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => studentApi('/roadmap'), [studentApi, studentId]);

  return (
    <>
      <PageTitle emoji="🗺️" title={isStudent ? 'My 3-year plan' : `${studentName}'s 3-year plan`} subtitle="Grade 5 → Grade 7. Master topics by scoring 85% or more in practice." />
      <ErrorNote error={error} />
      {loading && !data && <Busy />}
      {data && (
        <>
          <Tile className="section-tile next-steps">
            <h2>🧭 Next steps</h2>
            <ul>
              {data.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Tile>
          <div className="roadmap">
            {data.grades.map((g) => (
              <Tile key={g.grade} className={`roadmap-grade roadmap-grade--${g.phase}`}>
                <div className="roadmap-grade__head">
                  <h2>Grade {g.grade}</h2>
                  <span className="roadmap-grade__phase">{PHASE[g.phase]}</span>
                </div>
                <p className="muted small">🎯 {g.milestone}</p>
                <Meter value={g.progress} label={`Grade ${g.grade} progress`} />
                <p className="small">{g.progress}% of topics mastered</p>
                {g.subjects.map((s) => (
                  <div key={s.subject} className="roadmap-subject">
                    <h3>
                      {s.emoji} {s.label} <span className="muted small">{s.progress}%</span>
                    </h3>
                    <ul>
                      {s.topics.map((t) => (
                        <li key={t.id} className={`topic-state topic-state--${t.state}`}>
                          <span aria-label={t.state}>{STATE_ICON[t.state]}</span> {t.name}
                          {t.average !== null && <span className="muted small"> · {Math.round(t.average)}%</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {g.phase !== 'past' && (
                  <Button kind="ghost" size="sm" onClick={() => navigate('/practice')}>
                    Practise Grade {g.grade} topics →
                  </Button>
                )}
              </Tile>
            ))}
          </div>
          <p className="muted small legend">✅ mastered (85%+) · 🟠 in progress · ⚪ not started</p>
        </>
      )}
    </>
  );
}
