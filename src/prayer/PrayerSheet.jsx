import React, { useEffect, useId, useRef } from "react";

export function PrayerSheet({ open, title, onClose, children, className = "" }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const sheetRef = useRef(null);
  const closeRefCallback = useRef(onClose);

  useEffect(() => {
    closeRefCallback.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    document.body.classList.add("prayer-sheet-open");
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeRefCallback.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
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
      document.body.classList.remove("prayer-sheet-open");
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="prayer-sheet-layer">
      <div className="prayer-sheet-backdrop" role="presentation" onClick={onClose} />
      <section className={`prayer-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={sheetRef}>
        <div className="prayer-sheet-grab" />
        <header className="prayer-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="prayer-sheet-close" aria-label="Close" onClick={onClose} ref={closeRef}>×</button>
        </header>
        <div className="prayer-sheet-body">{children}</div>
      </section>
    </div>
  );
}
