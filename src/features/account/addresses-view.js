"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { addressesForUser, useAddressesStore } from "@/store";
import { AddressForm } from "./address-form";

const pick = (v) => ({ label: v.label, address: v.address, city: v.city, state: v.state, pincode: v.pincode, country: v.country, isDefault: v.isDefault });

/** Add, edit, delete and set default for saved addresses. */
export function AddressesView() {
  const { user } = useAuth();
  const all = useAddressesStore((s) => s.addresses);
  const { add, update, remove, setDefault } = useAddressesStore.getState();
  const [editing, setEditing] = useState(null); // address id, "new", or null
  if (!user) return null; // the route guard normally prevents this; stay safe if rendered early
  const addresses = addressesForUser(all, user.id);
  const current = addresses.find((a) => a.id === editing);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/account" className="text-sm text-brand-600 underline">
        ← Your account
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Saved addresses</h1>

      {editing ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">{editing === "new" ? "Add an address" : "Edit address"}</h2>
          <AddressForm
            initial={current ?? {}}
            showDefault
            submitLabel={editing === "new" ? "Save address" : "Save changes"}
            onCancel={() => setEditing(null)}
            onSubmit={(v) => {
              if (editing === "new") add(String(user.id), pick(v));
              else update(editing, pick(v));
              setEditing(null);
            }}
          />
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setEditing("new")} className="mt-4 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Add new address
          </button>
          {addresses.length === 0 ? (
            <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
              <MapPin className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold">No saved addresses</h2>
              <p className="mt-1 text-sm text-ink-soft">Add one to speed up checkout.</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3" aria-label="Saved addresses">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
                  <p className="font-semibold">
                    {a.label}
                    {a.isDefault && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">Default</span>}
                  </p>
                  <p className="mt-1 text-ink-soft">
                    {a.address}, {a.city}, {a.state} {a.pincode}, {a.country}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <button type="button" onClick={() => setEditing(a.id)} aria-label={`Edit ${a.label} address`} className="text-brand-600 hover:underline">
                      Edit
                    </button>
                    {!a.isDefault && (
                      <button type="button" onClick={() => setDefault(a.id)} aria-label={`Make ${a.label} address the default`} className="text-brand-600 hover:underline">
                        Set as default
                      </button>
                    )}
                    <button type="button" onClick={() => remove(a.id)} aria-label={`Delete ${a.label} address`} className="text-danger hover:underline">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
