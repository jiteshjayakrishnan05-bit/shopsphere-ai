import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useCartStore, useCompareStore } from "@/store";
import { normalizeProduct } from "@/services/api/normalize-product";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
import { ProductCard } from "@/components/products/product-card";
import { CompareView } from "@/features/compare/compare-view";
import { CompareBar } from "@/features/compare/compare-bar";

const card = (id, over) => normalizeProduct(rawProduct(id, over));
beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], savedForLater: [], couponCode: null });
  useCompareStore.setState({ ids: [] });
  hydrateStores();
});
afterEach(() => vi.unstubAllGlobals());

describe("Quick View", () => {
  it("opens an accessible dialog, adds to cart, and closes with Escape", async () => {
    render(<ProductCard product={card(1)} />);
    await userEvent.click(screen.getByRole("button", { name: "Quick view Product 1" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Product 1");
    expect(screen.getByRole("link", { name: "View full details" })).toHaveAttribute("href", "/products/1");
    const [add] = screen.getAllByRole("button", { name: "Add to cart" }).slice(-1);
    await userEvent.click(add);
    expect(useCartStore.getState().items).toHaveLength(1);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Quick view Product 1" })).toHaveFocus(); // focus restored
  });
  it("sends products with options to the full page instead of adding blindly", () => {
    render(<ProductCard product={card(7, { category: "mens-shirts" })} />);
    expect(screen.getByRole("link", { name: "Choose options" })).toHaveAttribute("href", "/products/7");
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
  });
});

describe("Compare", () => {
  it("limits selection to four products with a message", async () => {
    render(<>{[1, 2, 3, 4, 5].map((i) => <ProductCard key={i} product={card(i)} />)}</>);
    for (const i of [1, 2, 3, 4]) await userEvent.click(screen.getByRole("button", { name: `Compare Product ${i}` }));
    await userEvent.click(screen.getByRole("button", { name: "Compare Product 5" }));
    expect(useCompareStore.getState().ids).toEqual([1, 2, 3, 4]);
    expect(screen.getAllByText(/You can compare up to 4 products/).length).toBeGreaterThan(0);
  });
  it("tray requires two products before comparing", async () => {
    render(<><ProductCard product={card(1)} /><ProductCard product={card(2)} /><CompareBar /></>);
    await userEvent.click(screen.getByRole("button", { name: "Compare Product 1" }));
    expect(await screen.findByText(/pick at least 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare now" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Compare Product 2" }));
    expect(await screen.findByRole("link", { name: "Compare now" })).toHaveAttribute("href", "/compare");
  });
  it("shows a helpful state with fewer than two products", async () => {
    stubProductApi({});
    renderWithClient(<CompareView />);
    expect(await screen.findByText("Pick products to compare")).toBeInTheDocument();
  });
  it("renders a side-by-side table and removes products", async () => {
    useCompareStore.setState({ ids: [1, 2] });
    stubProductApi({ 1: rawProduct(1, { price: 10 }), 2: rawProduct(2, { price: 20, stock: 0 }) });
    renderWithClient(<CompareView />);
    expect(await screen.findByRole("table", { name: "Side-by-side product comparison" })).toBeInTheDocument();
    expect(await screen.findByText("₹840")).toBeInTheDocument();
    expect(screen.getByText("₹1,680")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Remove Product 2 from comparison/ }));
    expect(useCompareStore.getState().ids).toEqual([1]);
    expect(await screen.findByText(/at least one more/)).toBeInTheDocument();
  });
});
