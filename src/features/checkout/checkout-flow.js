"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { useAdminProductsStore, useCartStore, useCheckoutStore, useOrdersStore } from "@/store";
import { Skeleton } from "@/components/feedback/skeleton";
import { useCartSync } from "@/features/cart/use-cart-sync";
import { useCartPricing } from "@/features/cart/use-cart-pricing";
import { canCheckout } from "@/features/cart/cart-reconcile";
import { buildOrder } from "@/features/orders/order-builder";
import { getDeliveryOptions } from "./delivery-options";
import { PAYMENT_METHODS, simulatePayment } from "./mock-payment";
import { PriceBreakdown, StepAddress, StepConfirmation, StepCustomer, StepDelivery, StepPayment, StepSummary } from "./checkout-steps";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Customer", "Address", "Delivery", "Summary", "Payment", "Confirmation"];

function Stepper({ step, onJump }) {
  return (
    <ol aria-label="Checkout progress" className="flex flex-wrap gap-2">
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const inner = (
          <>
            <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs", done ? "bg-brand-600 text-white" : current ? "border-2 border-brand-600 text-brand-700" : "border border-line text-ink-soft")}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn("text-sm", current ? "font-semibold" : "text-ink-soft")}>{label}</span>
          </>
        );
        return (
          <li key={label} aria-current={current ? "step" : undefined}>
            {done && step < 5 ? (
              <button type="button" onClick={() => onJump(i)} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-muted" aria-label={`Go back to ${label}`}>
                {inner}
              </button>
            ) : (
              <span className="flex items-center gap-2 px-2 py-1">{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Six-step simulated checkout. Progress persists locally, so a refresh or an expired session resumes where you left off. */
export function CheckoutFlow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { lines, isChecking } = useCartSync();
  const pricing = useCartPricing(lines);
  const step = useCheckoutStore((s) => s.step);
  const data = useCheckoutStore((s) => s.data);
  const { setStep, updateData, reset } = useCheckoutStore.getState();
  const addOrder = useOrdersStore((s) => s.addOrder);

  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const headingRef = useRef(null);
  const prevStep = useRef(step);

  // A different customer signing in on this browser must not inherit someone else's saved checkout details.
  useEffect(() => {
    if (!user) return;
    if (data.ownerId && data.ownerId !== String(user.id)) reset();
    else if (!data.ownerId) updateData({ ownerId: String(user.id) });
  }, [user, data.ownerId, reset, updateData]);

  // Move focus to the step heading when the step changes (keyboard and screen-reader users).
  useEffect(() => {
    if (prevStep.current !== step) headingRef.current?.focus();
    prevStep.current = step;
  }, [step]);

  // Confirmation without an order (e.g. cleared storage) falls back to the start.
  useEffect(() => {
    if (step === 5 && !data.orderId) setStep(0);
  }, [step, data.orderId, setStep]);

  const taxable = pricing.totals.subtotal - pricing.totals.discount;
  const options = useMemo(() => getDeliveryOptions({ taxable, coupon: pricing.activeCoupon }), [taxable, pricing.activeCoupon]);
  const delivery = options.find((o) => o.id === data.deliveryId);
  const totals = pricing.totalsWithShipping(delivery ? delivery.cost : pricing.totals.shipping);

  if (!user) return null;

  if (step === 5 && data.orderId) {
    return (
      <Shell headingRef={headingRef} step={5} onJump={setStep}>
        <StepConfirmation orderId={data.orderId} onDone={reset} />
      </Shell>
    );
  }
  if (isChecking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-ink-soft">Add something before checking out.</p>
        <Link href="/products" className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Start shopping
        </Link>
      </div>
    );
  }
  if (!canCheckout(lines)) {
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Some items in your cart need attention</h1>
        <p className="mt-1 text-sm text-ink-soft">An item may be unavailable, out of stock or have a new price. Your checkout details are saved.</p>
        <Link href="/cart" className="mt-4 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Review your cart
        </Link>
      </div>
    );
  }

  const next = (patch) => {
    updateData(patch);
    setStep(step + 1);
  };
  const back = () => setStep(Math.max(0, step - 1));

  async function pay(method, details) {
    if (processing || data.orderId) return; // never create duplicate orders
    setProcessing(true);
    setPayError("");
    const methodMeta = PAYMENT_METHODS.find((m) => m.id === method);
    updateData({ payment: { method, ...details } });
    const result = await simulatePayment(method, details);
    if (!result.ok) {
      setPayError(result.reason);
      setProcessing(false);
      return;
    }
    const order = buildOrder({
      user,
      lines: pricing.payableLines,
      totals,
      couponCode: pricing.activeCoupon?.code ?? null,
      customer: data.customer,
      address: data.address,
      delivery,
      payment: { method, label: methodMeta.label, status: result.status },
    });
    addOrder(order);
    // A completed order reduces stock (saved locally), so inventory and low-stock alerts stay truthful.
    useAdminProductsStore.getState().commitOrderStock(
      pricing.payableLines.map((l) => ({ productId: l.item.productId, quantity: l.item.quantity, stock: l.live.product?.stock ?? l.item.snapshot.stock })),
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    useCartStore.getState().clear();
    updateData({ orderId: order.id });
    setStep(5);
    setProcessing(false);
  }

  return (
    <Shell headingRef={headingRef} step={step} onJump={setStep} aside={step < 5 ? <PriceBreakdown totals={totals} /> : null}>
      {step === 0 && <StepCustomer user={user} data={data} onNext={next} />}
      {step === 1 && <StepAddress user={user} data={data} onNext={(p) => { updateData(p); setStep(2); }} onBack={back} />}
      {step === 2 && <StepDelivery options={options} data={data} onNext={next} onBack={back} />}
      {step === 3 && delivery && data.customer && data.address && (
        <StepSummary lines={pricing.payableLines} totals={totals} data={data} delivery={delivery} onEdit={setStep} onNext={() => setStep(4)} onBack={back} />
      )}
      {step === 4 && delivery && (
        <StepPayment data={data} total={totals.total} onBack={back} onPay={pay} processing={processing} error={payError} />
      )}
      {((step === 3 && !(delivery && data.customer && data.address)) || (step === 4 && !delivery)) && (
        <div role="alert" className="text-sm">
          Some earlier details are missing.{" "}
          <button type="button" onClick={() => setStep(0)} className="font-medium text-brand-600 underline">
            Start from the first step
          </button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ step, onJump, headingRef, aside, children }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Test mode</span>
      </div>
      <div className="mt-4">
        <Stepper step={step} onJump={onJump} />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="step-heading">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mb-4 text-lg font-semibold outline-none">
            {STEP_LABELS[step]}
          </h2>
          {children}
        </section>
        {aside && (
          <aside aria-label="Order total" className="h-fit rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-2 text-base font-semibold">Order total</h2>
            {aside}
          </aside>
        )}
      </div>
    </div>
  );
}
