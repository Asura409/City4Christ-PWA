import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Icon } from '@/lib/icons';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

function getRateLimit() {
  try {
    const raw = sessionStorage.getItem('auth_rl');
    return raw ? JSON.parse(raw) : { attempts: 0, lockedAt: null };
  } catch { return { attempts: 0, lockedAt: null }; }
}

function setRateLimit(data) {
  try { sessionStorage.setItem('auth_rl', JSON.stringify(data)); } catch {}
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const emailRef = useRef(null);

  function validate() {
    const e = email.trim();
    if (!e) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');

    const msg = validate();
    if (msg) { setError(msg); return; }

    // client-side rate-limit guard
    const rl = getRateLimit();
    if (rl.lockedAt && Date.now() - rl.lockedAt < LOCKOUT_MS) {
      const mins = Math.ceil((LOCKOUT_MS - (Date.now() - rl.lockedAt)) / 60000);
      setError(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
      return;
    }
    if (rl.lockedAt && Date.now() - rl.lockedAt >= LOCKOUT_MS) {
      setRateLimit({ attempts: 0, lockedAt: null });
    }

    setLoading(true);
    try {
      const res = await fetch('https://city4christ-staging-api.onrender.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!res.ok) {
        const updated = { attempts: (rl.attempts || 0) + 1, lockedAt: rl.lockedAt };
        if (updated.attempts >= MAX_ATTEMPTS) updated.lockedAt = Date.now();
        setRateLimit(updated);

        // Use a generic message — never surface raw server errors to avoid info leaks
        setError('Invalid email or password.');
        return;
      }

      setRateLimit({ attempts: 0, lockedAt: null });
      navigate('/home', { replace: true });
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your church account">
      <form onSubmit={handleSubmit} noValidate autoComplete="on">
        {error && (
          <div className="auth-err" role="alert" aria-live="assertive">
            <Icon name="shield" />{error}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            ref={emailRef}
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
            aria-required="true"
            aria-describedby={error ? 'login-err' : undefined}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="login-pw">Password</label>
            <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </div>
          <div className="auth-pw-wrap">
            <input
              id="login-pw"
              type={showPw ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={128}
              required
              aria-required="true"
              disabled={loading}
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              <Icon name={showPw ? 'close' : 'search'} />
            </button>
          </div>
        </div>

        <button type="submit" className="btn gold block auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-foot">
        Don't have an account?{' '}
        <Link to="/signup" className="auth-link">Create one</Link>
      </p>
    </AuthLayout>
  );
}
