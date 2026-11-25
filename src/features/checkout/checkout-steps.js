"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { AddressForm } from "@/features/account/address-form";
import { formatPrice, formatShortDate } from "@/lib/formatters";
import { validateCustomer } from "@/lib/validators";
import { addressesForUser, useAddressesStore, useOrdersStore } from "@/store";
import { PAYMENT_METHODS, TEST_CARDS, validatePayment } from "./mock-payment";
import { statusLabel } from "@/features/orders/order-lifecycle";

const pickAddress = (a) => ({ address: a.address, city: a.city, state: a.state, pincode: a.pincode, country: a.country });
const Section = ({ title, onEdit, children }) => (
  <section className="rounded-lg border border-line bg-surface p-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-sm text-brand-600 underline">
          Change
        </button>
      )}
    </div>
    <div className="mt-2 text-sm text-ink-soft">{children}</div>
  </section>
);
const primaryBtn = "rounded-md bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn = "rounded-md border border-line px-6 py-2.5 text-sm font-medium hover:bg-surface-muted";
const radioRow = "flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50";

/** Step 1: customer information. */
export function StepCustomer({ user, data, onNext }) {
  const [v, setV] = useState(data.customer ?? { name: user.name, email: user.email, phone: user.phone ?? "" });
  const [errors, setErrors] = useState({});
  const change = (e) => setV((s) => ({ ...s, [e.target.name]: e.target.value }));
  function submit(e) {
    e.preventDefault();
    const errs = validateCustomer(v);
    setErrors(errs);
    if (!Object.keys(errs).length) onNext({ customer: v });
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Full name" name="name" autoComplete="name" value={v.name} onChange={change} error={errors.name} />
      <FormField label="Email" name="email" type="email" autoComplete="email" value={v.email} onChange={change} error={errors.email} />
      <FormField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel" hint="10 digits, no country code" value={v.phone} onChange={change} error={errors.phone} />
      <button type="submit" className={primaryBtn}>
        Continue
      </button>
    </form>
  );
}

/** Step 2: delivery address, with saved addresses for signed-in customers. */
export function StepAddress({ user, data, onNext, onBack }) {
  const addresses = useAddressesStore((s) => s.addresses);
  const addAddress = useAddressesStore((s) => s.add);
  const saved = addressesForUser(addresses, user.id);
  const [choice, setChoice] = useState(() =>
    data.addressId && saved.some((a) => a.id === data.addressId) ? data.addressId : saved.length ? (saved.find((a) => a.isDefault) ?? saved[0]).id : "new",
  );

  function useSaved() {
    const a = saved.find((x) => x.id === choice);
    onNext({ addressId: a.id, address: pickAddress(a) });
  }
  function submitNew(values) {
    const address = pickAddress(values);
    const addressId = values.save ? addAddress(String(user.id), { label: values.label, ...address, isDefault: false }) : null;
    onNext({ addressId, address });
  }

  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Saved addresses</legend>
          {saved.map((a) => (
            <label key={a.id} className={radioRow}>
              <input type="radio" name="address-choice" checked={choice === a.id} onChange={() => setChoice(a.id)} className="mt-1" />
              <span className="text-sm">
                <strong>{a.label}</strong>
                {a.isDefault && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">Default</span>}
                <br />
                {a.address}, {a.city}, {a.state} {a.pincode}, {a.country}
              </span>
            </label>
          ))}
          <label className={radioRow}>
            <input type="radio" name="address-choice" checked={choice === "new"} onChange={() => setChoice("new")} className="mt-1" />
            <span className="text-sm">Use a different address</span>
          </label>
        </fieldset>
      )}
      {choice === "new" ? (
        <AddressForm initial={data.addressId ? {} : (data.address ?? {})} onSubmit={submitNew} submitLabel="Continue" showSave />
      ) : (
        <button type="button" onClick={useSaved} className={primaryBtn}>
          Continue
        </button>
      )}
      <div>
        <button type="button" onClick={onBack} className={ghostBtn}>
          Back
        </button>
      </div>
    </div>
  );
}

/** Step 3: delivery method. */
export function StepDelivery({ options, data, onNext, onBack }) {
  const [id, setId] = useState(data.deliveryId ?? "standard");
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Choose a delivery method (simulated)</legend>
        {options.map((o) => (
          <label key={o.id} className={radioRow}>
            <input type="radio" name="delivery" value={o.id} checked={id === o.id} onChange={() => setId(o.id)} className="mt-1" />
            <span className="flex-1 text-sm">
              <strong>{o.label}</strong>
              <br />
              <span className="text-ink-soft">
                Arrives {formatShortDate(o.minDate)} – {formatShortDate(o.maxDate)}
              </span>
            </span>
            <span className="text-sm font-semibold">{o.cost === 0 ? "Free" : formatPrice(o.cost)}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={ghostBtn}>
          Back
        </button>
        <button type="button" onClick={() => onNext({ deliveryId: id })} className={primaryBtn}>
          Continue
        </button>
      </div>
    </div>
  );
}

export function PriceBreakdown({ totals }) {
  const Row = ({ k, v, strong, good }) => (
    <div className={`flex justify-between py-1 text-sm ${strong ? "border-t border-line pt-2 text-base font-semibold" : ""} ${good ? "text-success" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
  return (
    <dl>
      <Row k="Subtotal" v={formatPrice(totals.subtotal)} />
      {totals.discount > 0 && <Row k="Discount" v={`− ${formatPrice(totals.discount)}`} good />}
      <Row k="Delivery" v={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)} />
      <Row k="Tax (18%, simulated)" v={formatPrice(totals.tax)} />
      <Row k="Total" v={formatPrice(totals.total)} strong />
    </dl>
  );
}

/** Step 4: order summary with links back to change earlier steps. */
export function StepSummary({ lines, totals, data, delivery, onEdit, onNext, onBack }) {
  return (
    <div className="space-y-4">
      <ul aria-label="Items in your order" className="divide-y divide-line rounded-lg border border-line bg-surface">
        {lines.map((l) => (
          <li key={l.item.lineId} className="flex justify-between gap-3 p-3 text-sm">
            <span>
              {l.item.snapshot.title}
              {l.item.variant && <span className="text-ink-soft"> ({l.item.variant})</span>}
              <span className="text-ink-soft"> × {l.item.quantity}</span>
            </span>
            <span className="font-medium">{formatPrice(l.unitPrice * l.item.quantity)}</span>
          </li>
        ))}
      </ul>
      <Section title="Customer" onEdit={() => onEdit(0)}>
        {data.customer.name} · {data.customer.email} · {data.customer.phone}
      </Section>
      <Section title="Delivery address" onEdit={() => onEdit(1)}>
        {data.address.address}, {data.address.city}, {data.address.state} {data.address.pincode}, {data.address.country}
      </Section>
      <Section title="Delivery method" onEdit={() => onEdit(2)}>
        {delivery.label}, arrives {formatShortDate(delivery.minDate)} – {formatShortDate(delivery.maxDate)}
      </Section>
      <Section title="Price details">
        <PriceBreakdown totals={totals} />
      </Section>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={ghostBtn}>
          Back
        </button>
        <button type="button" onClick={onNext} className={primaryBtn}>
          Continue to payment
        </button>
      </div>
    </div>
  );
}

/** Step 5: mock payment. TEST MODE only: no real card, bank or UPI PIN data is requested or stored. */
export function StepPayment({ data, total, onBack, onPay, processing, error }) {
  const [method, setMethod] = useState(data.payment?.method ?? "card");
  const [testCard, setTestCard] = useState(data.payment?.testCard ?? "approve");
  const [upiId, setUpiId] = useState(data.payment?.upiId ?? "");
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const details = { testCard, upiId };
    const errs = validatePayment(method, details);
    setErrors(errs);
    if (!Object.keys(errs).length) onPay(method, details);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Test mode.</strong> This is a demonstration. No real payment is made, and no card numbers, bank details or UPI PINs are collected or stored.
        </span>
      </p>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Payment method</legend>
        {PAYMENT_METHODS.map((m) => (
          <label key={m.id} className={radioRow}>
            <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-1" />
            <span className="text-sm font-medium">{m.label}</span>
          </label>
        ))}
      </fieldset>

      {method === "card" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Choose a test card</legend>
          {TEST_CARDS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="testCard" value={c.id} checked={testCard === c.id} onChange={() => setTestCard(c.id)} /> {c.label}
            </label>
          ))}
          {errors.testCard && <p className="text-xs text-danger">{errors.testCard}</p>}
        </fieldset>
      )}
      {method === "upi" && (
        <FormField label="Test UPI handle" name="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="success@test" hint="Use a handle ending in @test. success@test approves, fail@test simulates a decline." error={errors.upiId} />
      )}
      {method === "cod" && <p className="text-sm text-ink-soft">You&apos;ll pay in cash when your order arrives. Nothing is charged now.</p>}

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Payment failed: {error} Your details are saved, so you can retry without starting over.
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={processing} className={ghostBtn}>
          Back
        </button>
        <button type="submit" disabled={processing} className={primaryBtn}>
          {processing ? "Processing test payment…" : error ? "Retry payment" : method === "cod" ? "Place order" : `Pay ${formatPrice(total)} (test)`}
        </button>
      </div>
    </form>
  );
}

/** Step 6: confirmation. */
export function StepConfirmation({ orderId, onDone }) {
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));
  if (!order) {
    return (
      <div role="alert" className="rounded-lg border border-line bg-surface p-6 text-center">
        <p className="text-sm">We couldn&apos;t find that order on this device.</p>
        <Link href="/orders" className="mt-3 inline-block text-sm font-medium text-brand-600 underline">
          View my orders
        </Link>
      </div>
    );
  }
  const paid = order.payment.status === "paid";
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-success/30 bg-success/5 p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        <h3 className="mt-2 text-lg font-semibold">Thank you! Your order is placed.</h3>
        <p className="mt-1 text-sm">
          Order ID: <strong data-testid="order-id">{order.id}</strong>
        </p>
      </div>
      <Section title="Delivery">
        {order.delivery.label}, expected by {formatShortDate(order.expectedDelivery)}.<br />
        {order.address.address}, {order.address.city}, {order.address.state} {order.address.pincode}, {order.address.country}
      </Section>
      <Section title="Payment">
        {order.payment.label}: {paid ? "Paid (simulated test payment)" : "Pay on delivery"}
      </Section>
      <Section title={`Items (status: ${statusLabel(order.status)})`}>
        <ul>
          {order.items.map((i) => (
            <li key={`${i.productId}-${i.variant}`} className="flex justify-between py-0.5">
              <span>
                {i.title} × {i.quantity}
              </span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-line pt-2">
          <PriceBreakdown totals={order.pricing} />
        </div>
      </Section>
      <p className="text-xs text-ink-soft">Order tracking in this demo is simulated. No real courier is involved.</p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/orders/${order.id}`} className={primaryBtn}>
          Track your order
        </Link>
        <Link href="/products" onClick={onDone} className={ghostBtn}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
