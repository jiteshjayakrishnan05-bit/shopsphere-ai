"use client";

import { useId, useState } from "react";
import { Truck } from "lucide-react";
import { estimateDelivery, formatDeliveryDate } from "./delivery";

/** Simulated pincode-based delivery estimate (clearly labelled as simulated). */
export function DeliveryEstimate() {
  const id = useId();
  const [pin, setPin] = useState("");
  const [result, setResult] = useState(null);

  function submit(e) {
    e.preventDefault();
    setResult(estimateDelivery(pin));
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-lg border border-line bg-surface p-4">
      <h2 id={`${id}-h`} className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="h-4 w-4" aria-hidden="true" /> Delivery
      </h2>
      <form onSubmit={submit} className="mt-3 flex gap-2" noValidate>
        <label htmlFor={`${id}-pin`} className="sr-only">
          Postal code
        </label>
        <input id={`${id}-pin`} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Enter 6-digit pincode" aria-describedby={`${id}-out`} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-surface-muted">
          Check
        </button>
      </form>
      <p id={`${id}-out`} role="status" className="mt-2 min-h-5 text-sm">
        {result && !result.valid && <span className="text-danger">Enter a valid 6-digit pincode.</span>}
        {result?.valid && (
          <span>
            Estimated delivery <strong>{formatDeliveryDate(result.minDate)}</strong> – <strong>{formatDeliveryDate(result.maxDate)}</strong>
          </span>
        )}
      </p>
      <p className="text-xs text-ink-soft">Simulated estimate for this demo. No real courier data is used.</p>
    </section>
  );
}
