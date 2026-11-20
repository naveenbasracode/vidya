import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form, RadioButton, RadioButtonGroup, Select, SelectItem, Stack, TextInput, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { ErrorNote } from '../components/common.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ role: 'STUDENT', name: '', email: '', password: '', grade: '5', parentEmail: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const user = await register({
        role: form.role,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        grade: form.role === 'STUDENT' ? Number(form.grade) : undefined,
        parentEmail: form.role === 'STUDENT' && form.parentEmail.trim() ? form.parentEmail.trim() : undefined,
      });
      navigate(user.role === 'STUDENT' ? '/setup' : '/family', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <Tile className="auth-card">
        <div className="auth-card__hero" aria-hidden>
          ✨
        </div>
        <h1>Create your account</h1>
        <Form onSubmit={submit}>
          <Stack gap={5}>
            <ErrorNote error={error} />
            <RadioButtonGroup legendText="I am a…" name="role" valueSelected={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <RadioButton id="role-student" labelText="🎒 Student" value="STUDENT" />
              <RadioButton id="role-parent" labelText="👪 Parent" value="PARENT" />
            </RadioButtonGroup>
            <TextInput id="name" labelText={form.role === 'STUDENT' ? 'Your first name' : 'Your name'} value={form.name} onChange={set('name')} required />
            <TextInput id="reg-email" type="email" labelText="Email" autoComplete="username" value={form.email} onChange={set('email')} required />
            <TextInput
              id="reg-password"
              type="password"
              labelText="Password"
              helperText="At least 6 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              required
            />
            {form.role === 'STUDENT' && (
              <>
                <Select id="grade" labelText="Grade" value={form.grade} onChange={set('grade')}>
                  <SelectItem value="5" text="Grade 5" />
                  <SelectItem value="6" text="Grade 6" />
                  <SelectItem value="7" text="Grade 7" />
                </Select>
                <TextInput
                  id="parent-email"
                  type="email"
                  labelText="Parent's email (optional)"
                  helperText="If your parent already has a Vidya account, they will be linked to you."
                  value={form.parentEmail}
                  onChange={set('parentEmail')}
                />
              </>
            )}
            <Button type="submit" disabled={busy} className="wide-button">
              {busy ? 'Creating…' : 'Create account'}
            </Button>
            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
}
