"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/feedback/skeleton";

/**
 * Client-side route guard. Frontend-only: it controls the UI, it is NOT server security.
 * Unauthenticated (or expired-session) visitors are sent to /login and returned afterwards.
 * @param {{roles?: ("customer"|"admin")[], children: React.ReactNode}} props
 */
export function RouteGuard({ roles, children }) {
  const { hydrated, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }
  if (!isAuthenticated) return <p className="px-4 py-10 text-center text-ink-soft">Redirecting to sign in…</p>;
  if (roles && !roles.includes(user.role)) {
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-ink-soft">This area is only available to {roles.join(" or ")} accounts.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-brand-600 underline">
          Back to the store
        </Link>
      </div>
    );
  }
  return children;
}
