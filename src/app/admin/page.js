"use client";

import { RouteGuard } from "@/components/common/route-guard";

export default function AdminPage() {
  return (
    <RouteGuard roles={["admin"]}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Administrator dashboard</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Access control is working. Product, order and analytics management arrive in Phase 9.
        </p>
      </div>
    </RouteGuard>
  );
}
