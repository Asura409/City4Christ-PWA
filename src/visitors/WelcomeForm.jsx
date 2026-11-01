import React from "react";
import { Link } from "react-router-dom";
import { useWelcomeForm } from "./useWelcomeForm";
import "./visitors.css";
export function WelcomeForm() {
  const s = useWelcomeForm();
  if (s.submitted)
    return (
      <div className="visitor-confirmation">
        <p role="status">Your welcome form has been received.</p>
        <p>Our welcome team can now review your form.</p>
        <Link to="/login" className="btn soft">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <>
      {s.error && <p role="alert">{s.error}</p>}
      {!s.config && !s.error && <p role="status">Loading welcome form…</p>}
      {s.config && !s.config.enabled && (
        <p>Visitor welcome forms are not available yet.</p>
      )}
      {s.config?.enabled && (
        <form
          aria-label="Visitor welcome form"
          className="visitor-form"
          onSubmit={s.submit}
        >
          <p>
            Tell our welcome team how to contact you about your visit.
            Submitting this form is optional.
          </p>
          {[
            ["fullName", "Full name", "text", 200],
            ["email", "Email address", "email", 254],
            ["phone", "Phone number (international format)", "tel", 16],
          ].map(([key, label, type, max]) => (
            <label className="auth-field" key={key}>
              {label}
              <input
                type={type}
                maxLength={max}
                required={key === "fullName"}
                disabled={s.busy}
                value={s.form[key]}
                onChange={(e) =>
                  s.setForm((x) => ({ ...x, [key]: e.target.value }))
                }
                autoComplete={key === "fullName" ? "name" : key}
              />
              {s.fields[key] && <span role="alert">{s.fields[key]}</span>}
            </label>
          ))}
          <p>
            Provide at least one contact method. Phone numbers must start with +
            and a country code.
          </p>
          <label className="visitor-consent">
            <input
              type="checkbox"
              required
              aria-label="Consent to visitor follow-up"
              checked={s.form.consent}
              disabled={s.busy}
              onChange={(e) =>
                s.setForm((x) => ({ ...x, consent: e.target.checked }))
              }
            />
            <span>{s.config.consentText}</span>
          </label>
          {s.fields.consent && <p role="alert">{s.fields.consent}</p>}
          <button
            className="btn gold block"
            disabled={s.busy || !s.form.consent}
          >
            {s.busy ? "Sending…" : "Send welcome form"}
          </button>
          <p className="visitor-privacy">
            This form is separate from account registration. To stop follow-up
            or request removal of your details, contact{" "}
            <a href="mailto:info@city4christ.org">info@city4christ.org</a>.
          </p>
        </form>
      )}
      {s.error && (!s.config || s.fields.policyVersion) && (
        <button className="btn soft" onClick={s.reload}>
          Reload welcome form
        </button>
      )}
      <p>
        <Link to="/login">Sign in</Link> ·{" "}
        <Link to="/events">Church events</Link>
      </p>
    </>
  );
}
