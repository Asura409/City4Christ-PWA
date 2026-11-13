import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function EventDialog({ title, subtitle, busy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className="event-dialog" aria-labelledby="event-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === ref.current && !busy) onClose(); }}>
      <div className="event-dialog-card">
        <header className="event-dialog-heading">
          <div><span className="event-eyebrow">EVENT TEAM</span><h2 id="event-dialog-title">{title}</h2><p>{subtitle}</p></div>
          <button type="button" className="event-dialog-close" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </dialog>, document.body,
  );
}
