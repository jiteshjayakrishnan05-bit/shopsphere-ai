"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RouteGuard } from "@/components/common/route-guard";
import { useAuth } from "@/hooks/use-auth";

function AccountSummary() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null; // the route guard normally prevents this; stay safe on the first render
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <dl className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {[
          ["Name", user.name],
          ["Email", user.email],
          ["Role", user.role],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <nav aria-label="Account sections" className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href="/orders" className="font-medium text-brand-600 underline">
          {user.role === "admin" ? "All orders" : "Your orders"}
        </Link>
        <Link href="/account/addresses" className="font-medium text-brand-600 underline">
          Saved addresses
        </Link>
        <Link href="/account/reviews" className="font-medium text-brand-600 underline">
          Your reviews
        </Link>
        <Link href="/account/preferences" className="font-medium text-brand-600 underline">
          Recommendation preferences
        </Link>
      </nav>
      <p className="mt-4 text-sm text-ink-soft">Profile editing and recommendation preferences arrive in later phases.</p>
      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/");
        }}
        className="mt-6 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted"
      >
        Sign out
      </button>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RouteGuard roles={["customer", "admin"]}>
      <AccountSummary />
    </RouteGuard>
  );
}
