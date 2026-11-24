"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Quantity stepper that can never exceed `max`.
 * @param {{value: number, max: number, onChange: (n: number) => void, label?: string, min?: number, disabled?: boolean}} props
 */
export function QuantitySelector({ value, max, onChange, label = "Quantity", min = 1, disabled = false }) {
  const id = useId();
  const clamp = (n) => Math.min(Math.max(min, Math.floor(Number(n) || min)), Math.max(min, max));
  const btn = "grid h-9 w-9 place-items-center rounded-md border border-line bg-surface hover:bg-surface-muted disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-labelledby={id}>
      <span id={id} className="sr-only">
        {label}
      </span>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => e.target.value !== "" && onChange(clamp(e.target.value))}
        className="h-9 w-14 rounded-md border border-line bg-surface text-center text-sm"
      />
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
