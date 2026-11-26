import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAssistantStore, useCartStore, useCompareStore } from "@/store";
import { emptyContext } from "@/services/assistant/conversation-service";
import { ASSISTANT_DISCLAIMER } from "@/services/assistant/assistant-service";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
import { AssistantWidget } from "@/features/ai-assistant/assistant-widget";
import { AssistantEntry } from "@/features/ai-assistant/assistant-entry";

// Prices are USD in the raw API and become INR at 84 per USD: 100 -> ₹8,400, 250 -> ₹21,000, 500 -> ₹42,000.
const catalogue = [
  rawProduct(1, { category: "smartphones", price: 100, rating: 4.0, title: "Phone One" }),
  rawProduct(2, { category: "smartphones", price: 250, rating: 4.5, title: "Phone Two" }),
  rawProduct(3, { category: "smartphones", price: 500, rating: 4.8, title: "Phone Three" }),
  rawProduct(4, { category: "laptops", price: 600, rating: 4.3, title: "Laptop One" }),
  rawProduct(5, { category: "mobile-accessories", price: 20, rating: 4.4, title: "Wireless Headphones", tags: ["headphones"] }),
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAssistantStore.setState({ open: false, messages: [], context: emptyContext() });
  useCartStore.setState({ items: [], savedForLater: [], couponCode: null });
  useCompareStore.setState({ ids: [] });
  hydrateStores();
  stubProductApi({}, [], catalogue);
});
afterEach(() => vi.unstubAllGlobals());

const setup = (opts) => renderWithClient(<AssistantWidget />, opts);
const openPanel = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Open shopping assistant" }));
  return screen.findByRole("dialog", { name: "Shopping assistant" });
};
const say = async (text) => userEvent.type(screen.getByLabelText("Message the shopping assistant"), `${text}{Enter}`);
const lastList = () => within(screen.getAllByRole("list", { name: "Suggested products" }).at(-1));

describe("opening and closing", () => {
  it("opens an accessible panel with starter prompts and moves focus to the input", async () => {
    setup();
    const panel = await openPanel();
    expect(within(panel).getByRole("log", { name: "Conversation" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Message the shopping assistant")).toHaveFocus();
    const starters = within(screen.getByRole("group", { name: "Starter prompts" })).getAllByRole("button");
    expect(starters).toHaveLength(4);
    expect(screen.getByText("Rule-based, not a live AI model")).toBeInTheDocument();
  });

  it("closes with Escape and returns focus to the launcher", async () => {
    setup();
    await openPanel();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Open shopping assistant" })).toHaveFocus();
  });

  it("states honestly that it is rule-based when the info section is opened", async () => {
    setup();
    await openPanel();
    const info = screen.getByRole("button", { name: "About this assistant" });
    expect(info).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(info);
    expect(info).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(ASSISTANT_DISCLAIMER)).toBeInTheDocument();
  });

  it("opens from the homepage entry point", async () => {
    renderWithClient(<><AssistantEntry /><AssistantWidget /></>);
    await userEvent.click(await screen.findByRole("button", { name: "Chat with the assistant" }));
    expect(await screen.findByRole("dialog", { name: "Shopping assistant" })).toBeInTheDocument();
    expect(screen.getAllByText(/not a live AI model/i).length).toBeGreaterThanOrEqual(2); // entry card and panel header both say so
  });

  it("moves the launcher up so it does not cover the compare bar", async () => {
    useCompareStore.setState({ ids: [1, 2] });
    setup();
    expect(await screen.findByRole("button", { name: "Open shopping assistant" })).toHaveClass("bottom-24");
  });
});

describe("conversation", () => {
  it("answers a starter prompt with numbered product cards and the parsed intent", async () => {
    setup();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Show me smartphones under 30000 rupees" }));
    expect(await screen.findByText(/I found 2 smartphones under ₹30,000/)).toBeInTheDocument();
    expect(screen.getByText("Understood:")).toBeInTheDocument();
    const items = lastList().getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Phone Two");
    expect(items[0]).toHaveTextContent("₹21,000");
    expect(items[0]).toHaveTextContent("1");
    expect(within(items[0]).getByRole("link", { name: "Phone Two" })).toHaveAttribute("href", "/products/2");
    expect(screen.queryByRole("group", { name: "Starter prompts" })).not.toBeInTheDocument();
  });

  it("keeps context across follow-ups: cheaper, then more like the first one", async () => {
    setup();
    await openPanel();
    await say("phones under 30000");
    await screen.findByText(/I found 2 smartphones/);
    await userEvent.click(screen.getByRole("button", { name: "Show me something cheaper" }));
    expect(await screen.findByText(/I found 1 smartphones under ₹14,699/)).toBeInTheDocument();
    expect(lastList().getByRole("link", { name: "Phone One" })).toBeInTheDocument();
    await say("Show me more like the first one");
    expect(await screen.findByText("Here are products similar to Phone One.")).toBeInTheDocument();
    expect(lastList().queryByRole("link", { name: "Phone One" })).not.toBeInTheDocument();
    await say("Never mind, show me headphones instead");
    expect(await screen.findByText(/I found 1 headphones under ₹14,699/)).toBeInTheDocument();
    expect(lastList().getByRole("link", { name: "Wireless Headphones" })).toBeInTheDocument();
  });

  it("never shows unrelated products for a message it cannot understand", async () => {
    setup();
    await openPanel();
    await say("what is the meaning of life");
    expect(await screen.findByText(/not sure I understood/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Suggested products" })).not.toBeInTheDocument();
    const suggestions = within(screen.getByRole("group", { name: "Suggested replies" })).getAllByRole("button");
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    await userEvent.click(suggestions[0]); // suggestions are real, working prompts
    expect(await screen.findAllByRole("list", { name: "Suggested products" })).toHaveLength(1);
  });

  it("adds a suggested product to the cart", async () => {
    setup();
    await openPanel();
    await say("laptops");
    await userEvent.click(await screen.findByRole("button", { name: "Add Laptop One to cart" }));
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([4]);
  });

  it("shows a loading indicator while working and blocks double sends", async () => {
    let release;
    const gate = new Promise((r) => (release = r));
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (/\/products\?/.test(String(url))) {
        await gate;
        return { ok: true, json: async () => ({ products: catalogue, total: 5, skip: 0, limit: 0 }) };
      }
      return { ok: true, json: async () => [] };
    }));
    setup();
    await openPanel();
    await say("phones");
    expect(await screen.findByRole("status", { name: "The assistant is typing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    release();
    await screen.findByText(/I found 3 smartphones/);
    expect(screen.queryByRole("status", { name: "The assistant is typing" })).not.toBeInTheDocument();
  });

  it("validates input: empty sends are disabled and the field is length-limited", async () => {
    setup();
    await openPanel();
    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Message the shopping assistant"), "   ");
    expect(send).toBeDisabled();
    expect(screen.getByLabelText("Message the shopping assistant")).toHaveAttribute("maxlength", "300");
  });
});

describe("errors, history and clearing", () => {
  it("keeps the conversation when the catalogue fails and offers a retry", async () => {
    stubProductApi({}, [], null); // catalogue requests now fail (404)
    setup();
    await openPanel();
    await say("phones under 30000");
    expect(await screen.findByText(/couldn't load the products just now/)).toBeInTheDocument();
    expect(screen.getByText("phones under 30000")).toBeInTheDocument(); // the user's message is still there
    stubProductApi({}, [], catalogue); // network recovers
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/I found 2 smartphones/)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load the products just now/)).not.toBeInTheDocument();
    expect(screen.getAllByText("phones under 30000")).toHaveLength(1); // retry did not duplicate the question
  });

  it("keeps the chat when the panel is closed and reopened", async () => {
    setup();
    await openPanel();
    await say("laptops");
    await screen.findByRole("link", { name: "Laptop One" });
    await userEvent.click(screen.getByRole("button", { name: "Close assistant" }));
    await openPanel();
    expect(within(screen.getByRole("log", { name: "Conversation" })).getAllByText("laptops").length).toBeGreaterThan(0); // the user's message is still there
    expect(await screen.findByRole("link", { name: "Laptop One" })).toBeInTheDocument();
  });

  it("restores a saved session after a reload", async () => {
    useAssistantStore.setState({ messages: [{ id: "a", role: "user", text: "phones" }, { id: "b", role: "assistant", text: "I found phones.", productIds: [2], suggestions: [], chips: [] }], context: { ...emptyContext(), category: "smartphones", resultIds: [2] } });
    hydrateStores(); // simulates reading sessionStorage on a fresh load
    setup();
    await openPanel();
    expect(screen.getByText("I found phones.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Phone Two" })).toBeInTheDocument();
  });

  it("clears the chat and its memory", async () => {
    setup();
    await openPanel();
    await say("phones");
    await screen.findByText(/I found 3 smartphones/);
    await userEvent.click(screen.getByRole("button", { name: "Clear chat" }));
    expect(useAssistantStore.getState().messages).toEqual([]);
    expect(useAssistantStore.getState().context).toEqual(emptyContext());
    expect(screen.getByRole("group", { name: "Starter prompts" })).toBeInTheDocument();
  });
});

describe("React StrictMode (as in npm run dev)", () => {
  it("works end to end", async () => {
    setup({ strict: true });
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Show me smartphones under 30000 rupees" }));
    expect(await screen.findByText(/I found 2 smartphones under ₹30,000/)).toBeInTheDocument();
    expect(useAssistantStore.getState().messages).toHaveLength(2); // one question, one answer
  });
});
