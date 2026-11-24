import { Suspense } from "react";
import { AuthCard } from "@/components/common/auth-card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" description="Welcome back. Sign in to checkout and track your orders.">
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 rounded-md bg-surface-muted p-3 text-xs text-ink-soft">
        Demo project: sign-in is simulated in your browser. See the README for demo accounts.
      </p>
    </AuthCard>
  );
}
