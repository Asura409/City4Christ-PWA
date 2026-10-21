import React from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
export default function NewUserScreen() {
  return (
    <AuthLayout title="Welcome home">
      <p>
        Your account is ready. You can edit your profile now; ministry
        membership and notification preferences will be available in a future
        release.
      </p>
      <Link className="btn gold" to="/profile">
        Set up my profile
      </Link>
    </AuthLayout>
  );
}
