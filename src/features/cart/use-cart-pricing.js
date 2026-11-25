"use client";

import { useCallback, useMemo } from "react";
import { useCartStore } from "@/store";
import { evaluateCoupon } from "./coupons";
import { calculateTotals } from "./pricing";
import { isPayable } from "./cart-reconcile";

/** Shared by the cart and checkout so both always show identical totals. */
export function useCartPricing(lines) {
  const couponCode = useCartStore((s) => s.couponCode);
  const payableLines = useMemo(() => lines.filter(isPayable), [lines]);
  const payable = useMemo(() => payableLines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.item.quantity })), [payableLines]);
  const subtotal = useMemo(() => calculateTotals(payable).subtotal, [payable]);
  const couponEval = couponCode ? evaluateCoupon(couponCode, subtotal) : null;
  const activeCoupon = couponEval?.status === "valid" ? couponEval.coupon : null;
  const couponMessage = couponEval && couponEval.status !== "valid" ? `${couponCode} no longer applies: ${couponEval.message}` : null;
  const totals = useMemo(() => calculateTotals(payable, activeCoupon), [payable, activeCoupon]);
  /** Totals using a chosen delivery cost instead of the standard shipping rule. */
  const totalsWithShipping = useCallback((shipping) => calculateTotals(payable, activeCoupon, { shipping }), [payable, activeCoupon]);
  return { couponCode, payableLines, subtotal, activeCoupon, couponMessage, totals, totalsWithShipping };
}
