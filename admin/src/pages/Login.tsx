import { useState, type FormEvent } from 'react';
import { getApiUrl, setApiUrl } from '../api';
import { useAuth } from '../auth';
import { ErrorBox } from '../components/ui';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setApiUrl(apiUrl);
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <div className="login">
        <div className="card">
          <div className="brand">
            <span className="brand-mark">K</span>
            <div>
              <div className="brand-name">Kovi Admin</div>
              <div className="brand-sub">internal team only</div>
            </div>
          </div>
          <form className="form" onSubmit={submit}>
            <ErrorBox error={error} />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <details className="advanced">
              <summary>Advanced: API server</summary>
              <div className="field" style={{ marginTop: 8 }}>
                <input value={apiUrl} onChange={(e) => setApiUrlState(e.target.value)} placeholder="https://api.example.com" />
                <span className="hint">Base URL of the Kovi API. Stored in this browser only.</span>
              </div>
            </details>
          </form>
        </div>
      </div>
    </div>
  );
}
