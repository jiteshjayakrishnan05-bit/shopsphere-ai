"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAllProducts } from "@/services/api/product-api";
import { respondToMessage } from "@/services/assistant/assistant-service";
import { MAX_INPUT_LENGTH } from "@/services/assistant/intent-parser";
import { useAssistantStore } from "@/store";

/**
 * Drives the conversation. Messages are saved before work starts, and a failure adds an error message with a
 * retry action instead of removing anything, so history is always preserved.
 */
export function useAssistantChat() {
  const queryClient = useQueryClient();
  const messages = useAssistantStore((s) => s.messages);
  const [thinking, setThinking] = useState(false);
  const busy = useRef(false);

  const send = useCallback(
    async (text, { addUser = true } = {}) => {
      const clean = String(text ?? "").trim().slice(0, MAX_INPUT_LENGTH);
      if (!clean || busy.current) return;
      busy.current = true;
      const { addMessage, setContext } = useAssistantStore.getState();
      if (addUser) addMessage({ role: "user", text: clean });
      setThinking(true);
      try {
        // Same cache entry the catalogue pages use, so the product list is usually already loaded.
        const data = await queryClient.ensureQueryData({ queryKey: queryKeys.products.catalogue("all"), queryFn: ({ signal }) => fetchAllProducts({ signal }) });
        const reply = await respondToMessage({ text: clean, context: useAssistantStore.getState().context, catalogue: data.products });
        addMessage({ role: "assistant", ...reply.message });
        setContext(reply.context);
      } catch {
        addMessage({ role: "assistant", error: true, text: "Sorry, I couldn't load the products just now. Your chat is saved, so you can try again.", retryText: clean, productIds: [], suggestions: [], chips: [] });
      } finally {
        busy.current = false;
        setThinking(false);
      }
    },
    [queryClient],
  );

  /** Remove the error message and run the same request again (the user's message stays in the history). */
  const retry = useCallback(
    (message) => {
      useAssistantStore.getState().removeMessage(message.id);
      return send(message.retryText, { addUser: false });
    },
    [send],
  );

  return { messages, thinking, send, retry };
}
