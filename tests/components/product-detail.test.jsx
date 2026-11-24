import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useCartStore, useRecentlyViewedStore } from "@/store";

const push = vi.fn();
vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => ({ get: () => null }) }));
import { ProductDetail } from "@/features/products/product-detail";

const setup = (routes) => {
  localStorage.clear();
  useCartStore.setState({ items: [], savedForLater: [], couponCode: null });
  useRecentlyViewedStore.setState({ ids: [] });
  push.mockClear();
  hydrateStores();
  stubProductApi(routes);
};
afterEach(() => vi.unstubAllGlobals());

describe("ProductDetail", () => {
  it("renders details, specifications and read-only reviews as plain text", async () => {
    setup({ 1: rawProduct(1, { discountPercentage: 20, price: 10 }) });
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Product 1" })).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("Specifications")).toBeInTheDocument();
    expect(screen.getByText("SKU1")).toBeInTheDocument();
    expect(screen.getByText("Great <b>stuff</b>")).toBeInTheDocument(); // escaped, not rendered as HTML
    expect(screen.queryByText("s@x.com")).not.toBeInTheDocument();
  });
  it("records the product in recently viewed", async () => {
    setup({ 1: rawProduct(1) });
    renderWithClient(<ProductDetail id="1" />);
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(useRecentlyViewedStore.getState().ids).toEqual([1]));
  });
  it("adds the chosen quantity to the cart and caps it at stock", async () => {
    setup({ 1: rawProduct(1, { stock: 3 }) });
    renderWithClient(<ProductDetail id="1" />);
    await screen.findByRole("heading", { level: 1 });
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(3);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(await screen.findByRole("button", { name: "Max in cart" })).toBeDisabled();
  });
  it("disables unavailable variants and adds the selected variant as its own line", async () => {
    // id 7, mens-shirts: option S is unavailable by the documented demo rule
    setup({ 7: rawProduct(7, { category: "mens-shirts" }) });
    renderWithClient(<ProductDetail id="7" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("radio", { name: /S \(unavailable\)/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "M" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "L" }));
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(useCartStore.getState().items[0].lineId).toBe("7:L");
  });
  it("disables purchase actions when out of stock", async () => {
    setup({ 1: rawProduct(1, { stock: 0 }) });
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Buy now" })).toBeDisabled();
  });
  it("Buy now adds the item and sends a guest through login to checkout", async () => {
    setup({ 1: rawProduct(1) });
    renderWithClient(<ProductDetail id="1" />);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Buy now" }));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(push).toHaveBeenCalledWith("/login?next=%2Fcheckout");
  });
  it("gives a simulated delivery estimate and validates the pincode", async () => {
    setup({ 1: rawProduct(1) });
    renderWithClient(<ProductDetail id="1" />);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.type(screen.getByLabelText("Postal code"), "123{Enter}");
    expect(await screen.findByText("Enter a valid 6-digit pincode.")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Postal code"));
    await userEvent.type(screen.getByLabelText("Postal code"), "600001{Enter}");
    expect(await screen.findByText(/Estimated delivery/)).toBeInTheDocument();
    expect(screen.getByText(/Simulated estimate/)).toBeInTheDocument();
  });
  it("shows a friendly not-found state for a missing product", async () => {
    setup({ 999: "404" });
    renderWithClient(<ProductDetail id="999" />);
    expect(await screen.findByText("We couldn't find that product")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toBeInTheDocument();
  });
  it("shows an error with retry when the API is down", async () => {
    setup({ 1: "network" });
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByText("Couldn't load this product")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
