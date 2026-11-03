import React from 'react';

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-wrap reference-auth">
      <div className="auth-glow" aria-hidden="true" />
      <div className="auth-logo">
        <img src="/assets/images/logo.jpeg" alt="City4Christ logo" />
      </div>
      <h1 className="auth-wordmark">City4Christ</h1>
      <p className="reference-auth-tagline">The House of Good News</p>
      {title && <h2 className="auth-title">{title}</h2>}
      {subtitle && <p className="auth-sub">{subtitle}</p>}
      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}
