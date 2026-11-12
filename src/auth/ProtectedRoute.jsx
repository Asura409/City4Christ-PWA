import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "./session";

// Set VITE_BYPASS_AUTH=true in .env.local for local UI testing only.
// Never commit that file — .env.* is gitignored.
const BYPASS = import.meta.env.VITE_BYPASS_AUTH === "true";

export function ProtectedRoute({ children }) {
  const { profile, loading, error, restore } = useSession();
  const location = useLocation();
  if (BYPASS) return children;
  if (loading) return <p role="status">Checking your session…</p>;
  if (error)
    return (
      <section>
        <p role="alert">{error}</p>
        <button onClick={() => void restore()}>Retry connection</button>
      </section>
    );
  return profile ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
