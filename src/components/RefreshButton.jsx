import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import "./refresh-controls.css";

export function RefreshButton({ label = "Refresh", busy = false, disabled = false, className = "", onClick, ...props }) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true), active = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const working = busy || pending;
  return <button {...props} type="button" className={`refresh-icon-button ${className}`} aria-label={label} title={label} aria-busy={working} disabled={disabled || working} onClick={async (event) => {
    if (active.current) return;
    active.current = true; setPending(true);
    try { await onClick?.(event); } finally { active.current = false; if (mounted.current) setPending(false); }
  }}><Icon name="refresh" className={working ? "refresh-icon-spinning" : ""} /></button>;
}
