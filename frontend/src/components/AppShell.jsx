import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Content, Select, SelectItem } from '@carbon/react';
import { Logout, Notification } from '@carbon/icons-react';
import { useAuth } from '../context/auth.jsx';
import { api } from '../api.js';
import { todayStr } from '../utils.js';

const STUDENT_NAV = [
  { to: '/', label: 'Today', emoji: '☀️' },
  { to: '/schedule', label: 'My Week', emoji: '📅' },
  { to: '/practice', label: 'Practice', emoji: '✏️' },
  { to: '/exams', label: 'Exams', emoji: '📝' },
  { to: '/progress', label: 'Achievements', emoji: '🏆' },
  { to: '/roadmap', label: '3-Year Plan', emoji: '🗺️' },
];

export default function AppShell({ children }) {
  const { user, logout, isStudent, isParent, isAdmin, childrenList, selectedChild, setSelectedChildId, studentId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Poll unread alerts for the current student
  useEffect(() => {
    if (!studentId || (isStudent && !user.onboarded)) return undefined;
    let cancelled = false;
    const load = () =>
      api(`/students/${studentId}/notifications?today=${todayStr()}`)
        .then((d) => !cancelled && setUnread(d.unread))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [studentId, isStudent, user.onboarded, location.pathname]);

  const nav = [
    ...(studentId && !(isStudent && !user.onboarded) ? STUDENT_NAV : []),
    ...(isStudent || isParent ? [{ to: '/setup', label: isStudent ? 'My Activities' : 'Activities', emoji: '🥋' }] : []),
    ...(isParent || isAdmin ? [{ to: '/family', label: isAdmin ? 'Students' : 'Family', emoji: '👨‍👩‍👧' }] : []),
    ...(isAdmin
      ? [
          { to: '/admin/documents', label: 'Curriculum PDFs', emoji: '📄' },
          { to: '/admin/exams', label: 'Exam Bank', emoji: '🗂️' },
        ]
      : []),
  ];

  const go = (to) => (e) => {
    e.preventDefault();
    navigate(to);
  };
  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <>
      <Header aria-label="Vidya" className="vidya-header">
        <HeaderName href="/" prefix="" onClick={go('/')}>
          <span className="vidya-logo">🦉 Vidya</span>
        </HeaderName>
        {(isParent || isAdmin) && childrenList.length > 0 && (
          <div className="child-switcher">
            <Select
              id="child-switcher"
              labelText=""
              hideLabel
              size="sm"
              value={selectedChild?.id ?? ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {childrenList.map((c) => (
                <SelectItem key={c.id} value={c.id} text={`👦 ${c.name} (Grade ${c.grade ?? '?'})`} />
              ))}
            </Select>
          </div>
        )}
        <HeaderGlobalBar>
          {studentId && (
            <HeaderGlobalAction aria-label={`Alerts (${unread} unread)`} onClick={() => navigate('/alerts')} className="alerts-action">
              <Notification size={20} />
              {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
            </HeaderGlobalAction>
          )}
          <HeaderGlobalAction
            aria-label="Log out"
            tooltipAlignment="end"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <Content className="vidya-content">
        <nav className="kid-nav" aria-label="Main">
          {nav.map((n) => (
            <a key={n.to} href={n.to} onClick={go(n.to)} className={`kid-nav__item ${isActive(n.to) ? 'is-active' : ''}`}>
              <span className="kid-nav__emoji" aria-hidden>
                {n.emoji}
              </span>
              {n.label}
            </a>
          ))}
          <span className="kid-nav__user">
            {user.name} · {user.role.toLowerCase()}
          </span>
        </nav>
        <main id="main-content">{children}</main>
      </Content>
    </>
  );
}
