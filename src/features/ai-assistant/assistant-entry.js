"use client";

import { MessageCircle } from "lucide-react";
import { useAssistantStore } from "@/store";

/** Homepage entry point that opens the shopping assistant. */
export function AssistantEntry() {
  const openPanel = useAssistantStore((s) => s.openPanel);
  return (
    <section aria-labelledby="assistant-entry-heading" className="mt-12 rounded-[var(--radius-card)] border border-line bg-brand-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h2 id="assistant-entry-heading" className="text-lg font-semibold">
          Ask the shopping assistant
        </h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          Say what you want, like “headphones under 5000 with good ratings”, then refine with “something cheaper” or “more like the second one”. It is a rule-based assistant, not a live AI model.
        </p>
      </div>
      <button type="button" onClick={openPanel} className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 sm:mt-0">
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat with the assistant
      </button>
    </section>
  );
}
