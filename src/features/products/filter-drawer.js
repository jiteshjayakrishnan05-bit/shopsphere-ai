"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";

/** Mobile/tablet filter drawer (accessible dialog: focus trap, Escape, focus restore). */
export function FilterDrawer({ open, onClose, resultCount, children }) {
  const ref = useRef(null);
  useDialogA11y({ open, onClose, containerRef: ref });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 left-0 flex w-80 max-w-[90vw] flex-col bg-canvas shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-muted">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        <div className="border-t border-line p-4">
          <button type="button" onClick={onClose} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Show {resultCount} {resultCount === 1 ? "product" : "products"}
          </button>
        </div>
      </div>
    </div>
  );
}
