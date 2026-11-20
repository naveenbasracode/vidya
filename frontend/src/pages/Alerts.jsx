// In-app notifications (FR13): low scores, missed habits/study, red weeks.
import { Button, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { useLoad, useStudentApi } from '../hooks.js';
import { Busy, EmptyState, ErrorNote, PageTitle } from '../components/common.jsx';

export default function Alerts() {
  const { isStudent, studentName } = useAuth();
  const { studentApi, studentId } = useStudentApi();
  const { data, setData, error, loading } = useLoad(() => studentApi('/notifications'), [studentApi, studentId]);

  const markAll = async () => {
    await studentApi('/notifications/read-all', { method: 'POST', body: {} });
    setData((d) => ({ ...d, unread: 0, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
  };
  const markOne = async (n) => {
    await studentApi(`/notifications/${n.id}/read`, { method: 'POST', body: {} });
    setData((d) => ({ ...d, unread: Math.max(0, d.unread - 1), notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
  };

  return (
    <>
      <PageTitle emoji="🔔" title={isStudent ? 'My alerts' : `Alerts for ${studentName}`} subtitle="Scores below 85%, missed habits or study blocks, and red weeks.">
        {data?.unread > 0 && (
          <Button kind="secondary" size="sm" onClick={markAll}>
            Mark all as read
          </Button>
        )}
      </PageTitle>
      <ErrorNote error={error} />
      {loading && !data && <Busy />}
      {data && data.notifications.length === 0 && (
        <EmptyState emoji="🎉" title="No alerts">
          <p>Everything is on track!</p>
        </EmptyState>
      )}
      <ul className="alert-list">
        {data?.notifications.map((n) => (
          <li key={n.id}>
            <Tile className={`alert alert--${n.severity} ${n.read ? 'is-read' : ''}`}>
              <p>{n.message}</p>
              <div className="alert__meta">
                <span className="muted small">{new Date(n.createdAt).toLocaleString()}</span>
                {!n.read && (
                  <Button kind="ghost" size="sm" onClick={() => markOne(n)}>
                    Mark read
                  </Button>
                )}
              </div>
            </Tile>
          </li>
        ))}
      </ul>
    </>
  );
}
