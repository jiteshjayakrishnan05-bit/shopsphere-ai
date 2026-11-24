import { Suspense } from "react";
import { AuthCard } from "@/components/common/auth-card";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" description="Save addresses, track orders and get personalised picks.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
