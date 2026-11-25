"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { OrderDetail } from "./order-detail";

export function OrderDetailPage({ id }) {
  return (
    <RouteGuard roles={["customer", "admin"]}>
      <OrderDetail id={id} />
    </RouteGuard>
  );
}
