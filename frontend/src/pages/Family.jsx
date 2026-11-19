// Parents manage which children they follow; admins see every student.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineNotification, Select, SelectItem, Stack, TextInput, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { api } from '../api.js';
import { EmptyState, ErrorNote, PageTitle } from '../components/common.jsx';

export default function Family() {
  const { isAdmin, childrenList, refreshChildren, selectedChild, setSelectedChildId } = useAuth();
  const navigate = useNavigate();
  const [linkEmail, setLinkEmail] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', grade: '5' });
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async (fn, msg) => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await fn();
      await refreshChildren();
      if (r?.child) setSelectedChildId(r.child.id);
      setOk(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const link = () => run(() => api('/family/children/link', { method: 'POST', body: { email: linkEmail.trim() } }), 'Child linked! 🎉').then(() => setLinkEmail(''));
  const create = () =>
    run(() => api('/family/children', { method: 'POST', body: { ...form, grade: Number(form.grade) } }), `Account created. ${form.name} can now log in with ${form.email}.`).then(() =>
      setForm({ name: '', email: '', password: '', grade: '5' }),
    );
  const unlink = (child) => run(() => api(`/family/children/${child.id}`, { method: 'DELETE' }), `${child.name} removed from your family list.`);

  return (
    <>
      <PageTitle emoji="👨‍👩‍👧" title={isAdmin ? 'Students' : 'My family'} subtitle={isAdmin ? 'All student accounts.' : 'Choose a child to see their day, edit their timetable and follow their progress.'} />
      <ErrorNote error={error} onClose={() => setError(null)} />
      {ok && <InlineNotification kind="success" lowContrast title={ok} onClose={() => setOk(null)} className="note" />}

      {childrenList.length === 0 ? (
        <EmptyState emoji="🧒" title={isAdmin ? 'No students yet' : 'No children linked yet'}>
          {!isAdmin && <p>Add your child below to get started.</p>}
        </EmptyState>
      ) : (
        <div className="child-grid">
          {childrenList.map((c) => (
            <Tile key={c.id} className={`child-card ${selectedChild?.id === c.id ? 'is-selected' : ''}`}>
              <div className="child-card__avatar" aria-hidden>
                🧒
              </div>
              <h2>{c.name}</h2>
              <p className="muted">
                Grade {c.grade ?? '?'} · {c.email}
              </p>
              {!c.onboarded && <p className="small">⚠️ Activities not set up yet</p>}
              <div className="button-row">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedChildId(c.id);
                    navigate(c.onboarded ? '/' : '/setup');
                  }}
                >
                  {c.onboarded ? 'Open' : 'Set up activities'}
                </Button>
                {!isAdmin && (
                  <Button size="sm" kind="ghost" onClick={() => unlink(c)} disabled={busy}>
                    Remove
                  </Button>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="two-col">
          <Tile className="section-tile">
            <h2>🔗 Link an existing student account</h2>
            <Stack gap={5}>
              <TextInput id="link-email" type="email" labelText="Your child's Vidya email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} />
              <Button onClick={link} disabled={busy || !linkEmail.trim()}>
                Link child
              </Button>
            </Stack>
          </Tile>
          <Tile className="section-tile">
            <h2>➕ Create an account for your child</h2>
            <Stack gap={5}>
              <TextInput id="c-name" labelText="Child's first name" value={form.name} onChange={set('name')} />
              <TextInput id="c-email" type="email" labelText="Login email" helperText="Can be any email you choose for them" value={form.email} onChange={set('email')} />
              <TextInput id="c-password" type="password" labelText="Password" helperText="At least 6 characters" value={form.password} onChange={set('password')} />
              <Select id="c-grade" labelText="Grade" value={form.grade} onChange={set('grade')}>
                <SelectItem value="5" text="Grade 5" />
                <SelectItem value="6" text="Grade 6" />
                <SelectItem value="7" text="Grade 7" />
              </Select>
              <Button onClick={create} disabled={busy || !form.name.trim() || !form.email.trim() || form.password.length < 6}>
                Create account
              </Button>
            </Stack>
          </Tile>
        </div>
      )}
    </>
  );
}
