"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible disclosure dropdown: button with aria-expanded, closes on Escape, outside click,
 * focus leaving, or activating a link/`data-close` element inside.
 */
export function Dropdown({ label, icon: Icon, children, align = "left", buttonClassName, panelClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (open && !rootRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-muted", buttonClassName)}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
        {label}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          onClick={(e) => {
            if (e.target.closest("a,[data-close]")) setOpen(false);
          }}
          className={cn(
            "absolute z-50 mt-1 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-pop",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
