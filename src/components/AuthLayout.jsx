import React from 'react';

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="authwrap">
      <div className="authbrand" aria-hidden="true">
        <div className="authbrand-orb authbrand-orb-1" />
        <div className="authbrand-orb authbrand-orb-2" />
        <div className="authbrand-inner">
          <div className="authbrand-logo">
            <img src="/assets/images/logo.jpeg" alt="City4Christ logo" />
          </div>
          <h1 className="authbrand-name">City4Christ</h1>
          <p className="authbrand-tagline">The House of Good News</p>
        </div>
      </div>
      <div className="authmain">
        <div className="authbox">
          {title && <h2 className="auth-title">{title}</h2>}
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          <div className="auth-card">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
