import React from "react";
import "./social-links.css";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 21v-7h2.6l.4-3h-3V9.1c0-.9.3-1.5 1.6-1.5h1.5V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H8.5v3h2.7v7h3.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="M10.4 9.4l4.2 2.6-4.2 2.6V9.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/city4christ/", Icon: InstagramIcon },
  { name: "Facebook", href: "https://web.facebook.com/City4Christ", Icon: FacebookIcon },
  { name: "YouTube", href: "https://www.youtube.com/@city4christ125", Icon: YouTubeIcon },
];

export function SocialLinks({ heading = "Follow City4Christ" }) {
  return (
    <section className="social-links" aria-label={heading}>
      <div className="social-links-heading">
        <h2>{heading}</h2>
        <span>@city4christ</span>
      </div>
      <div className="social-links-row">
        {LINKS.map(({ name, href, Icon }) => (
          <a
            className="social-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`City4Christ on ${name} (opens in a new tab)`}
            key={name}
          >
            <span className="social-link-icon"><Icon /></span>
            <span>{name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
