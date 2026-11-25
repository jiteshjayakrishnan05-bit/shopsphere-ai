"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { CheckoutFlow } from "@/features/checkout/checkout-flow";

export default function CheckoutPage() {
  return (
    <RouteGuard roles={["customer"]}>
      <CheckoutFlow />
    </RouteGuard>
  );
}
