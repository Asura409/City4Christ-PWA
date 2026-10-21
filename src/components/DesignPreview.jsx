import React from "react";
export function DesignPreview({ children }) {
  return (
    <section aria-label="Design preview">
      <p className="preview-notice" role="status">
        Design preview — sample content only. Posting, joining, RSVP and
        notifications are not available yet.
      </p>
      <div inert={true}>{children}</div>
    </section>
  );
}
