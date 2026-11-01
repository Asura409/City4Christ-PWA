import React from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { WelcomeForm } from "@/visitors/WelcomeForm";
export default function WelcomeScreen() {
  return (
    <AuthLayout
      title="Welcome to City4Christ"
      subtitle="We’re glad you’re here."
    >
      <WelcomeForm />
    </AuthLayout>
  );
}
