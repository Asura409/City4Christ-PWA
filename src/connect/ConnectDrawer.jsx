import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/lib/icons";
import "./connect.css";

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

const SOCIAL_LINKS = [
  { name: "Instagram", handle: "@city4christ", href: "https://www.instagram.com/city4christ/", Icon: InstagramIcon },
  { name: "Facebook", handle: "City4Christ", href: "https://web.facebook.com/City4Christ", Icon: FacebookIcon },
  { name: "YouTube", handle: "@city4christ125", href: "https://www.youtube.com/@city4christ125", Icon: YouTubeIcon },
];

export function ConnectDrawer({ open, onClose }) {
  const drawerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    document.body.classList.add("connect-open");
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("connect-open");
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="connect-layer">
      <div className="connect-backdrop" role="presentation" onClick={onClose} />
      <aside
        className="connect-drawer"
        id="connect-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        ref={drawerRef}
      >
        <header className="connect-head">
          <div className="connect-brand">
            <img src="/assets/images/logo.jpeg" alt="" />
            <span>City4Christ</span>
          </div>
          <button className="connect-close" type="button" aria-label="Close Stay connected" onClick={onClose} ref={closeRef}>
            <Icon name="close" />
          </button>
        </header>

        <div className="connect-scroll">
          <p className="connect-kicker">STAY CONNECTED</p>
          <h2 id="connect-title">Follow City4Christ</h2>
          <p className="connect-sub">Daily encouragement, service updates and moments from church life.</p>

          <nav className="connect-socials" aria-label="Social media">
            {SOCIAL_LINKS.map(({ name, handle, href, Icon: SocialIcon }) => (
              <a
                className="connect-social"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`City4Christ on ${name} (opens in a new tab)`}
                key={name}
              >
                <span className="connect-social-icon"><SocialIcon /></span>
                <span className="connect-social-copy"><strong>{name}</strong><small>{handle}</small></span>
                <span className="connect-social-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>

          <div className="connect-divider" />

          <section className="connect-care" aria-label="Pastoral care">
            <h3>Need someone to talk to?</h3>
            <p>Our pastoral team is here for prayer, care and conversations.</p>
            <Link className="connect-care-link is-primary" to="/pastors" onClick={onClose}>
              <span>Book pastoral care</span><span aria-hidden="true">→</span>
            </Link>
            <Link className="connect-care-link" to="/prayer" onClick={onClose}>
              <span>Send a prayer request</span><span aria-hidden="true">→</span>
            </Link>
          </section>

          <Link className="connect-give" to="/giving" onClick={onClose}>
            <span className="connect-give-icon"><Icon name="heart" fill /></span>
            <span className="connect-give-copy"><strong>Give to City4Christ</strong><small>Support the church through Give A Little</small></span>
            <span className="connect-give-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <footer className="connect-foot">
          <span>City4Christ · @city4christ</span>
          <Link to="/get-app" onClick={onClose}>Get the app →</Link>
        </footer>
      </aside>
    </div>
  );
}
