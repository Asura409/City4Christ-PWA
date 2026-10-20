import React from 'react';

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-wrap">
      <div className="auth-glow" aria-hidden="true" />
      <div className="auth-logo" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 5c4 3 8 5 12 6M18 5c-4 3-8 5-12 6M12 8v13" />
        </svg>
      </div>
      <h1 className="auth-wordmark">City4Christ</h1>
      {title && <h2 className="auth-title">{title}</h2>}
      {subtitle && <p className="auth-sub">{subtitle}</p>}
      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}
