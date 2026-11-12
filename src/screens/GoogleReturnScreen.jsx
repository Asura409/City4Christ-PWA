import React, { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { useSession } from "@/auth/session";
import { googleErrorMessage } from "@/auth/google";
import { LoadingSpinner } from "../components/LoadingSpinner";

export default function GoogleReturnScreen() {
  const { profile, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const failure = params.get("auth_error");
  const linking = params.get("intent") === "link";
  const reauthenticated = params.get("reauthentication") === "complete";
  const [returnTo] = React.useState(() => {
    if (!reauthenticated) return "";
    try {
      const stored = sessionStorage.getItem("city4christ:reauth-return") || "";
      sessionStorage.removeItem("city4christ:reauth-return");
      const destination = new URL(stored, location.origin);
      return destination.origin === location.origin
        ? `${destination.pathname}${destination.search}${destination.hash}`
        : "";
    } catch {
      // Session storage is a convenience; the normal profile fallback remains.
      return "";
    }
  });
  useEffect(() => {
    if (!failure && !loading && profile) {
      if (reauthenticated && returnTo) navigate(returnTo, { replace: true });
      else navigate(linking ? "/profile" : "/home", { replace: true });
    }
  }, [failure, loading, profile, linking, navigate, reauthenticated, returnTo]);
  return (
    <AuthLayout title="Google sign-in">
      {failure ? (
        <p role="alert">{googleErrorMessage(failure)}</p>
      ) : loading ? (
        <LoadingSpinner className="session-loading-indicator" label="Loading" />
      ) : !profile ? (
        <p role="alert">
          We could not restore your Google session. Please try signing in again.
          Your browser must allow this site's session cookie.
        </p>
      ) : null}
      {(!loading || failure) && (
        <Link to={profile ? (reauthenticated && returnTo ? returnTo : "/profile") : "/login"}>
          {profile ? (reauthenticated && returnTo ? "Return to your previous screen" : "Back to profile") : "Back to sign in"}
        </Link>
      )}
    </AuthLayout>
  );
}
