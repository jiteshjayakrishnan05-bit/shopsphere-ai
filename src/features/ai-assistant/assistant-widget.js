"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Info, MessageCircle, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useCatalogueSource } from "@/hooks/use-catalogue-source";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAssistantStore, useCompareStore } from "@/store";
import { ASSISTANT_DISCLAIMER } from "@/services/assistant/assistant-service";
import { STARTER_PROMPTS } from "@/services/assistant/category-lexicon";
import { MAX_INPUT_LENGTH } from "@/services/assistant/intent-parser";
import { AssistantProductCard } from "./assistant-product-card";
import { useAssistantChat } from "./use-assistant-chat";
import { cn } from "@/lib/utils";

const chip = "rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs hover:bg-surface-muted disabled:opacity-50";

function Bubble({ role, children }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2 text-sm", role === "user" ? "bg-brand-600 text-white" : "bg-surface-muted text-ink")}>{children}</div>
    </div>
  );
}

function AssistantMessage({ message, isLast, thinking, byId, onSend, onRetry, onNavigate }) {
  const products = (message.productIds ?? []).map((id) => byId.get(id)).filter(Boolean);
  return (
    <div className="space-y-2">
      <Bubble role="assistant">
        <p>{message.text}</p>
        {message.chips?.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
            <span>Understood:</span>
            {message.chips.map((c) => (
              <span key={c} className="rounded-full bg-surface px-2 py-0.5 text-ink">
                {c}
              </span>
            ))}
          </p>
        )}
      </Bubble>
      {products.length > 0 && (
        <ol aria-label="Suggested products" className="space-y-2 pl-1">
          {products.map((p, i) => (
            <AssistantProductCard key={p.id} product={p} index={i + 1} onNavigate={onNavigate} />
          ))}
        </ol>
      )}
      {message.link && (
        <Link href={message.link.href} onClick={onNavigate} className="inline-block pl-1 text-xs font-medium text-brand-600 underline">
          {message.link.label}
        </Link>
      )}
      {message.error && (
        <button type="button" onClick={() => onRetry(message)} disabled={thinking} className={cn(chip, "inline-flex items-center gap-1.5 font-medium text-brand-700")}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </button>
      )}
      {isLast && !thinking && message.suggestions?.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-1" aria-label="Suggested replies" role="group">
          {message.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onSend(s)} className={chip}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssistantPanel({ launcherRef }) {
  const { messages, thinking, send, retry } = useAssistantChat();
  const close = useAssistantStore((s) => s.closePanel);
  const clear = useAssistantStore((s) => s.clear);
  const { data: catalogue } = useCatalogueSource({ type: "all" });
  const byId = useMemo(() => new Map((catalogue ?? []).map((p) => [p.id, p])), [catalogue]);
  const [draft, setDraft] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  // Move focus into the panel on open and back to the launcher on close.
  useEffect(() => {
    inputRef.current?.focus();
    const launcher = launcherRef.current;
    return () => launcher?.focus();
  }, [launcherRef]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, thinking]);

  const onNavigate = () => {
    // The panel is full-screen on phones, so close it when following a link.
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches) close();
  };
  function submit(e) {
    e.preventDefault();
    const text = draft;
    setDraft("");
    send(text);
  }

  return (
    <div
      id="assistant-panel"
      role="dialog"
      aria-label="Shopping assistant"
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="fixed inset-0 z-50 flex flex-col bg-canvas sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[36rem] sm:max-h-[calc(100vh-7rem)] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-line sm:shadow-pop"
    >
      <header className="flex items-center gap-1 border-b border-line px-4 py-3">
        <div className="mr-auto">
          <h2 className="text-base font-semibold">Shopping assistant</h2>
          <p className="text-xs text-ink-soft">Rule-based, not a live AI model</p>
        </div>
        <button type="button" onClick={() => setShowInfo((v) => !v)} aria-expanded={showInfo} aria-controls="assistant-info" aria-label="About this assistant" className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-muted">
          <Info className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={clear} aria-label="Clear chat" className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-muted">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={close} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-muted">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {showInfo && (
        <div id="assistant-info" className="border-b border-line bg-surface-muted px-4 py-3 text-xs text-ink-soft">
          <p>{ASSISTANT_DISCLAIMER}</p>
          <p className="mt-1">It understands categories, budgets, minimum ratings, and colours where the product data lists them. Nothing you type leaves your browser.</p>
        </div>
      )}

      <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto p-4">
        <Bubble role="assistant">Hi! I can find products by category, budget and rating, then refine the results as we chat.</Bubble>
        {messages.length === 0 && (
          <div role="group" aria-label="Starter prompts" className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className={chip}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <Bubble key={m.id} role="user">
              {m.text}
            </Bubble>
          ) : (
            <AssistantMessage key={m.id} message={m} isLast={i === messages.length - 1} thinking={thinking} byId={byId} onSend={send} onRetry={retry} onNavigate={onNavigate} />
          ),
        )}
        {thinking && (
          <div role="status" aria-label="The assistant is typing" className="flex gap-1 pl-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-ink-soft" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="assistant-input" className="sr-only">
          Message the shopping assistant
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_INPUT_LENGTH}
          autoComplete="off"
          placeholder="e.g. headphones under 5000"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm"
        />
        <button type="submit" disabled={thinking || !draft.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

/** Floating launcher plus the chat panel. Mounted once in the root layout. */
export function AssistantWidget() {
  const hydrated = useHydrated();
  const open = useAssistantStore((s) => s.open);
  const toggle = useAssistantStore((s) => s.toggle);
  const compareCount = useCompareStore((s) => s.ids.length);
  const launcherRef = useRef(null);
  if (!hydrated) return null; // the chat comes from sessionStorage, so render it only after hydration

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
        className={cn("fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-pop hover:bg-brand-700 sm:right-6", compareCount > 0 ? "bottom-24" : "bottom-4 sm:bottom-6", open && "max-sm:hidden")}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
      </button>
      {open && <AssistantPanel launcherRef={launcherRef} />}
    </>
  );
}
