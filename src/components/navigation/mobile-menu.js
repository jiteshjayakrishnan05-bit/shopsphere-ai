"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useCategories } from "@/hooks/use-products";
import { formatCategory } from "@/lib/formatters";
import { APP_NAME } from "@/lib/constants";

/** Slide-in navigation drawer for screens below the lg breakpoint. */
export function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDialogA11y({ open, onClose: close, containerRef: ref });
  const { data: categories } = useCategories();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-md hover:bg-surface-muted lg:hidden">
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={close} aria-hidden="true" />
          <div ref={ref} role="dialog" aria-modal="true" aria-label={`${APP_NAME} menu`} className="absolute inset-y-0 left-0 flex w-80 max-w-[90vw] flex-col bg-canvas shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-semibold">{APP_NAME}</span>
              <button type="button" onClick={close} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-muted">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
              <ul>
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={close} className="block rounded-md px-3 py-3 text-base font-medium hover:bg-surface-muted">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="px-3 pb-1 pt-4 text-xs font-medium text-ink-soft">Categories</p>
              <ul>
                {(categories ?? []).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} onClick={close} className="block rounded-md px-3 py-2 text-sm hover:bg-surface-muted">
                      {formatCategory(c.slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
