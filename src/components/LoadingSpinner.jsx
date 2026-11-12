import React from "react";
import "./refresh-controls.css";

export function LoadingSpinner({ label = "Loading", className = "" }) {
  return <span className={`loading-indicator ${className}`} role="status" aria-label={label}><span className="loading-spinner" aria-hidden="true" /></span>;
}
