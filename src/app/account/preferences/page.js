"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { PreferencesView } from "@/features/recommendations/preferences-view";

export default function PreferencesPage() {
  return (
    <RouteGuard roles={["customer", "admin"]}>
      <PreferencesView />
    </RouteGuard>
  );
}
