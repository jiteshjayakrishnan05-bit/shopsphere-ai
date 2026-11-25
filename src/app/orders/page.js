"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { OrdersView } from "@/features/orders/orders-view";

export default function OrdersPage() {
  return (
    <RouteGuard roles={["customer", "admin"]}>
      <OrdersView />
    </RouteGuard>
  );
}
