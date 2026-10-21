import React from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "./session";
export function ProtectedRoute({ children }) {
  const { profile, loading, error, restore } = useSession();
  if (loading) return <p role="status">Checking your session…</p>;
  if (error)
    return (
      <section>
        <p role="alert">{error}</p>
        <button onClick={() => void restore()}>Retry connection</button>
      </section>
    );
  return profile ? children : <Navigate to="/login" replace />;
}
