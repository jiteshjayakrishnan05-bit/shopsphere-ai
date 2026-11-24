"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { FormField } from "@/components/common/form-field";
import { isValidEmail } from "@/lib/validators";
import { safeRedirect } from "@/lib/safe-redirect";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!isValidEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      const session = await login(values.email, values.password);
      router.replace(safeRedirect(next, session.user.role === "admin" ? "/admin" : "/"));
    } catch (err) {
      setFormError(err?.name === "AuthError" ? err.message : "We couldn't sign you in. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <FormField label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} error={errors.password} />
      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-brand-600 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
