import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Form, Stack, TextInput, Tile } from '@carbon/react';
import { useAuth } from '../context/auth.jsx';
import { ErrorNote } from '../components/common.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      const dest = user.role === 'STUDENT' ? (user.onboarded ? location.state?.from ?? '/' : '/setup') : user.role === 'ADMIN' ? '/admin/documents' : '/';
      navigate(dest, { replace: true });
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
          🦉
        </div>
        <h1>Welcome to Vidya</h1>
        <p className="auth-card__tagline">Plan your study, track your activities, and watch yourself grow! 🌱</p>
        <Form onSubmit={submit}>
          <Stack gap={5}>
            <ErrorNote error={error} />
            <TextInput id="email" type="email" labelText="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextInput
              id="password"
              type="password"
              labelText="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={busy} className="wide-button">
              {busy ? 'Logging in…' : 'Log in'}
            </Button>
            <p>
              New here? <Link to="/register">Create an account</Link>
            </p>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
}
