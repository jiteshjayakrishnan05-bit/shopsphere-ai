"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { FormField } from "@/components/common/form-field";
import { isValidEmail, isValidPassword, isValidPhone } from "@/lib/validators";
import { safeRedirect } from "@/lib/safe-redirect";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!isValidEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!isValidPhone(values.phone)) nextErrors.phone = "Enter a valid 10-digit mobile number.";
    if (!isValidPassword(values.password)) nextErrors.password = "Use at least 8 characters.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      await register(values);
      router.replace(safeRedirect(next, "/"));
    } catch (err) {
      if (err?.name === "AuthError") {
        if (err.field) setErrors({ [err.field]: err.message });
        else setFormError(err.message);
      } else {
        setFormError("We couldn't create your account. Please try again.");
      }
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
      <FormField label="Full name" name="name" autoComplete="name" value={values.name} onChange={onChange} error={errors.name} />
      <FormField label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
      <FormField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel" hint="10 digits, no country code" value={values.phone} onChange={onChange} error={errors.phone} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters" value={values.password} onChange={onChange} error={errors.password} />
      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-brand-600 underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
