import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hydrateStores } from "../helpers";
import { useSearchHistoryStore } from "@/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: () => null }),
}));

import { SearchBox } from "@/components/navigation/search-box";

const raw = (id, title) => ({ id, title, category: "laptops", price: 10, discountPercentage: 0, rating: 4, stock: 5, thumbnail: "t.png", images: [] });
let fetchMock;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SearchBox />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useSearchHistoryStore.setState({ terms: [] });
  push.mockClear();
  hydrateStores();
  fetchMock = vi.fn(async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("/products/categories")
        ? [{ slug: "laptops", name: "Laptops" }]
        : { products: [raw(1, "Huawei Matebook")], total: 1, skip: 0, limit: 5 },
  }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const searchCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes("/products/search"));

describe("SearchBox", () => {
  it("shows popular searches when focused and empty, without calling the search API", async () => {
    setup();
    await userEvent.click(screen.getByRole("combobox", { name: "Search products" }));
    expect(await screen.findByText("Popular searches")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "laptop" })).toBeInTheDocument();
    expect(searchCalls()).toHaveLength(0);
  });
  it("debounces: one request after typing stops, with product and category suggestions", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox"), "lap");
    expect(await screen.findByRole("option", { name: /Huawei Matebook/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Laptops \(category\)/ })).toBeInTheDocument();
    expect(searchCalls()).toHaveLength(1);
    expect(String(searchCalls()[0][0])).toContain("q=lap");
  });
  it("submits to /search?q= and records the term", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox"), "red shoes{Enter}");
    expect(push).toHaveBeenCalledWith("/search?q=red%20shoes");
    expect(useSearchHistoryStore.getState().terms).toEqual(["red shoes"]);
  });
  it("ignores an empty submit", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox"), "   {Enter}");
    expect(push).not.toHaveBeenCalled();
  });
  it("lists and clears recent searches", async () => {
    useSearchHistoryStore.setState({ terms: ["watch"] });
    setup();
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Recent searches")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
    await waitFor(() => expect(useSearchHistoryStore.getState().terms).toEqual([]));
  });
  it("truncates absurdly long queries", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox"), `${"x".repeat(150)}{Enter}`);
    const url = decodeURIComponent(push.mock.calls[0][0]);
    expect(url.length).toBeLessThanOrEqual("/search?q=".length + 100);
  });
});
