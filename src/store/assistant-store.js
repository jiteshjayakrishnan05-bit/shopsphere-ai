import { createJSONStorage } from "zustand/middleware";
import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";
import { emptyContext } from "@/services/assistant/conversation-service";

const MAX_MESSAGES = 60;

/**
 * Chat state for the shopping assistant. The conversation lives in sessionStorage ("the active session"):
 * it survives navigation and reloads of the tab, and disappears when the tab is closed.
 * Messages hold product ids only, never copies of products.
 */
export const useAssistantStore = createPersistedStore(
  STORAGE_KEYS.assistant,
  (set) => ({
    open: false,
    /** @type {{id: string, role: "user"|"assistant", text: string, productIds?: number[], link?: object|null, suggestions?: string[], chips?: string[], error?: boolean, retryText?: string}[]} */
    messages: [],
    context: emptyContext(),
    openPanel: () => set({ open: true }),
    closePanel: () => set({ open: false }),
    toggle: () => set((s) => ({ open: !s.open })),
    addMessage: (message) => set((s) => ({ messages: [...s.messages, { id: crypto.randomUUID(), ...message }].slice(-MAX_MESSAGES) })),
    removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
    setContext: (context) => set({ context }),
    clear: () => set({ messages: [], context: emptyContext() }),
  }),
  {
    storage: createJSONStorage(() => sessionStorage),
    partialize: (s) => ({ messages: s.messages, context: s.context }), // the panel itself always starts closed
  },
);
