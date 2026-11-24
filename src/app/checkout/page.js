"use client";

import Link from "next/link";
import { RouteGuard } from "@/components/common/route-guard";

export default function CheckoutPage() {
  return (
    <RouteGuard roles={["customer"]}>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-2 text-sm text-ink-soft">
          You&apos;re signed in, so you can reach checkout. The six-step simulated checkout is built in the next phase. Your cart is kept safely.
        </p>
        <Link href="/cart" className="mt-5 inline-block text-sm font-medium text-brand-600 underline">
          Back to cart
        </Link>
      </div>
    </RouteGuard>
  );
}
