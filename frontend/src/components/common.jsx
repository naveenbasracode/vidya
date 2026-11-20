import { InlineNotification, InlineLoading } from '@carbon/react';
import { STATUS, SUBJECTS } from '../utils.js';

export const PageTitle = ({ emoji, title, subtitle, children }) => (
  <div className="page-title">
    <div>
      <h1>
        {emoji && (
          <span className="page-title__emoji" aria-hidden>
            {emoji}
          </span>
        )}
        {title}
      </h1>
      {subtitle && <p className="page-title__subtitle">{subtitle}</p>}
    </div>
    {children && <div className="page-title__actions">{children}</div>}
  </div>
);

export const ErrorNote = ({ error, onClose }) =>
  error ? (
    <InlineNotification kind="error" title="Oops!" subtitle={error} lowContrast hideCloseButton={!onClose} onClose={onClose} className="note" />
  ) : null;

export const Busy = ({ text = 'Loading…' }) => <InlineLoading description={text} className="busy" />;

export const StatusBadge = ({ status, percent, big = false }) => {
  if (!status) return <span className={`status-badge status--none ${big ? 'status-badge--big' : ''}`}>No data yet</span>;
  const s = STATUS[status];
  return (
    <span className={`status-badge ${s.className} ${big ? 'status-badge--big' : ''}`}>
      {s.emoji} {percent !== undefined && percent !== null ? `${Math.round(percent)}% · ` : ''}
      {s.label}
    </span>
  );
};

export const SubjectChip = ({ subject, small }) => {
  const s = SUBJECTS[subject];
  if (!s) return null;
  return (
    <span className={`subject-chip ${small ? 'subject-chip--small' : ''}`} style={{ '--subject-color': s.color }}>
      <span aria-hidden>{s.emoji}</span> {s.label}
    </span>
  );
};

export const Meter = ({ value, label }) => {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const status = value === null || value === undefined ? 'none' : pct >= 95 ? 'green' : pct >= 85 ? 'amber' : 'red';
  return (
    <div className="meter" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`meter__fill meter__fill--${status}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const EmptyState = ({ emoji = '🌱', title, children }) => (
  <div className="empty-state">
    <div className="empty-state__emoji" aria-hidden>
      {emoji}
    </div>
    <h3>{title}</h3>
    {children}
  </div>
);
