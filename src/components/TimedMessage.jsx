import React, { useEffect, useState } from "react";

const DEFAULT_DURATION = 10000;

export function TimedMessage({ tone = "success", message = "", duration = DEFAULT_DURATION, className = "" }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!visible || !message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`timed-message ${tone === "error" ? "" : "message-success"} ${className}`.trim()}
    >
      {message}
    </p>
  );
}
