import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/lib/icons";
import { api, useSession } from "@/auth/session";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);

  function validate() {
    const e = email.trim();
    if (!e) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/home", { replace: true });
    } catch (error) {
      setError(
        error.status === 401 ? "Invalid email or password." : error.message,
      );
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your church account">
      <form onSubmit={handleSubmit} noValidate autoComplete="on">
        {error && (
          <div
            id="login-err"
            className="auth-err"
            role="alert"
            aria-live="assertive"
          >
            <Icon name="shield" />
            {error}
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
            aria-required="true"
            aria-describedby={error ? "login-err" : undefined}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="login-pw">Password</label>
            <Link to="/forgot-password" className="auth-forgot">
              Forgot password?
            </Link>
          </div>
          <div className="auth-pw-wrap">
            <input
              id="login-pw"
              type={showPw ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={128}
              required
              aria-required="true"
              disabled={loading}
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              <Icon name={showPw ? "close" : "search"} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn gold block auth-submit"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button
        className="btn soft block"
        onClick={() =>
          location.assign(
            api.googleStartURL(new URL("/auth.html", location.origin).href),
          )
        }
      >
        Continue with Google
      </button>
      <p className="auth-foot">
        Don't have an account?{" "}
        <Link to="/signup" className="auth-link">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
