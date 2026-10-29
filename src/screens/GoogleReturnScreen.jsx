import React, { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { useSession } from "@/auth/session";
import { googleErrorMessage } from "@/auth/google";

export default function GoogleReturnScreen() {
  const { profile, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const failure = params.get("auth_error");
  const linking = params.get("intent") === "link";
  useEffect(() => {
    if (!failure && !loading && profile)
      navigate(linking ? "/profile" : "/home", { replace: true });
  }, [failure, loading, profile, linking, navigate]);
  return (
    <AuthLayout title="Google sign-in">
      {failure ? (
        <p role="alert">{googleErrorMessage(failure)}</p>
      ) : loading ? (
        <p role="status">Completing Google sign-in…</p>
      ) : !profile ? (
        <p role="alert">
          We could not restore your Google session. Please try signing in again.
          Your browser must allow this site's session cookie.
        </p>
      ) : null}
      {(!loading || failure) && (
        <Link to={profile ? "/profile" : "/login"}>
          {profile ? "Back to profile" : "Back to sign in"}
        </Link>
      )}
    </AuthLayout>
  );
}
