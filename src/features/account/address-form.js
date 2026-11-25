"use client";

import { useState } from "react";
import { FormField } from "@/components/common/form-field";
import { validateAddress } from "@/lib/validators";

/**
 * Address form shared by checkout and the account page.
 * @param {{initial?: object, onSubmit: (values: object) => void, onCancel?: () => void, submitLabel?: string,
 *   showSave?: boolean, showDefault?: boolean}} props
 */
export function AddressForm({ initial = {}, onSubmit, onCancel, submitLabel = "Save address", showSave = false, showDefault = false }) {
  const [v, setV] = useState({
    label: initial.label ?? "Home",
    address: initial.address ?? "",
    city: initial.city ?? "",
    state: initial.state ?? "",
    pincode: initial.pincode ?? "",
    country: initial.country ?? "India",
    isDefault: Boolean(initial.isDefault),
    save: true,
  });
  const [errors, setErrors] = useState({});
  const change = (e) => setV((s) => ({ ...s, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function submit(e) {
    e.preventDefault();
    const errs = validateAddress(v);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit(v);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="addr-label" className="block text-sm font-medium">
          Address label
        </label>
        <select id="addr-label" name="label" value={v.label} onChange={change} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
          {["Home", "Work", "Other"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <FormField label="Address" name="address" autoComplete="street-address" value={v.address} onChange={change} error={errors.address} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" name="city" autoComplete="address-level2" value={v.city} onChange={change} error={errors.city} />
        <FormField label="State" name="state" autoComplete="address-level1" value={v.state} onChange={change} error={errors.state} />
        <FormField label="Postal code" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={v.pincode} onChange={change} error={errors.pincode} />
        <FormField label="Country" name="country" autoComplete="country-name" value={v.country} onChange={change} error={errors.country} />
      </div>
      {showSave && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="save" checked={v.save} onChange={change} /> Save this address to my account
        </label>
      )}
      {showDefault && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDefault" checked={v.isDefault} onChange={change} /> Make this my default address
        </label>
      )}
      <div className="flex gap-3">
        <button type="submit" className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-muted">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
