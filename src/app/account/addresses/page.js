"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { AddressesView } from "@/features/account/addresses-view";

export default function AddressesPage() {
  return (
    <RouteGuard roles={["customer", "admin"]}>
      <AddressesView />
    </RouteGuard>
  );
}
