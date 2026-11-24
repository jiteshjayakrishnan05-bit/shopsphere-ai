import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cartItem, hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAuthStore, useCartStore } from "@/store";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/cart", useSearchParams: () => ({ get: () => null }) }));

import { CartView } from "@/features/cart/cart-view";

const seed = (items, extra = {}) => {
  localStorage.clear();
  useCartStore.setState({ items, savedForLater: [], couponCode: null, ...extra });
  useAuthStore.setState({ session: null });
  hydrateStores();
};
afterEach(() => vi.unstubAllGlobals());
const checkout = () => screen.queryByRole("link", { name: "Proceed to checkout" });

describe("CartView", () => {
  it("shows an empty state with a way back to shopping", async () => {
    seed([]);
    stubProductApi({});
    renderWithClient(<CartView />);
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start shopping" })).toHaveAttribute("href", "/products");
  });

  it("computes totals from live data and allows checkout", async () => {
    seed([cartItem(1, 2)]);
    stubProductApi({ 1: rawProduct(1) });
    renderWithClient(<CartView />);
    // 2 x 840 = 1680, free shipping, tax 302 -> 1982
    expect(await screen.findByText("₹1,982")).toBeInTheDocument();
    await waitFor(() => expect(checkout()).toBeInTheDocument());
    expect(checkout()).toHaveAttribute("href", "/login?next=%2Fcheckout"); // guest goes via login
  });

  it("clamps quantity to live stock and explains why", async () => {
    seed([cartItem(1, 5, { stock: 10 })]);
    stubProductApi({ 1: rawProduct(1, { stock: 2 }) });
    renderWithClient(<CartView />);
    expect(await screen.findByText(/Only 2 in stock, so we adjusted the quantity/)).toBeInTheDocument();
    await waitFor(() => expect(useCartStore.getState().items[0].quantity).toBe(2));
  });

  it("asks the customer to confirm a price change and blocks checkout until accepted", async () => {
    seed([cartItem(1, 1, { price: 840 })]);
    stubProductApi({ 1: rawProduct(1, { price: 12 }) }); // 1008
    renderWithClient(<CartView />);
    expect(await screen.findByText(/The price changed from/)).toBeInTheDocument();
    expect(screen.getByText("₹840")).toBeInTheDocument();
    expect(screen.getAllByText("₹1,008").length).toBeGreaterThan(0);
    expect(checkout()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept new price" }));
    await waitFor(() => expect(checkout()).toBeInTheDocument());
    expect(useCartStore.getState().items[0].snapshot.price).toBe(1008);
  });

  it("keeps a removed product visible, blocks checkout, and lets the customer remove it", async () => {
    seed([cartItem(1, 1), cartItem(2, 1)]);
    stubProductApi({ 1: rawProduct(1), 2: "404" });
    renderWithClient(<CartView />);
    expect(await screen.findByText(/no longer available/)).toBeInTheDocument();
    expect(checkout()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Product 2" }));
    await waitFor(() => expect(checkout()).toBeInTheDocument());
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([1]);
  });

  it("flags out-of-stock items and excludes them from totals", async () => {
    seed([cartItem(1, 1), cartItem(2, 1)]);
    stubProductApi({ 1: rawProduct(1), 2: rawProduct(2, { stock: 0 }) });
    renderWithClient(<CartView />);
    expect(await screen.findByText(/Out of stock\. We kept it here/)).toBeInTheDocument();
    expect(checkout()).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(2); // never silently discarded
  });

  it("uses last-known data when the API fails and offers a retry", async () => {
    seed([cartItem(1, 1)]);
    const fetchMock = stubProductApi({ 1: "network" });
    renderWithClient(<CartView />);
    expect(await screen.findByText(/We couldn't reach the store/)).toBeInTheDocument();
    expect(screen.getByText(/Showing the last known price and stock/)).toBeInTheDocument();
    expect(checkout()).toBeInTheDocument();
    const before = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before));
  });

  it("applies valid coupons and gives clear feedback for invalid and expired ones", async () => {
    seed([cartItem(1, 2)]);
    stubProductApi({ 1: rawProduct(1) });
    renderWithClient(<CartView />);
    await screen.findByText("₹1,982");
    const input = screen.getByLabelText("Coupon code");
    await userEvent.type(input, "bogus{Enter}");
    expect(await screen.findByText(/isn't a valid coupon code/)).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "summer25{Enter}");
    expect(await screen.findByText(/expired/)).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "welcome10{Enter}");
    expect(await screen.findByText(/WELCOME10 applied/)).toBeInTheDocument();
    // subtotal 1680, discount 168 -> taxable 1512, tax 272, total 1784
    expect(screen.getByText("− ₹168")).toBeInTheDocument();
    expect(screen.getByText("₹1,784")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove coupon WELCOME10" }));
    expect(await screen.findByText("₹1,982")).toBeInTheDocument();
  });

  it("saves an item for later and moves it back", async () => {
    seed([cartItem(1, 1), cartItem(2, 1)]);
    stubProductApi({ 1: rawProduct(1), 2: rawProduct(2) });
    renderWithClient(<CartView />);
    await screen.findAllByText("Product 1");
    const list = screen.getByRole("list", { name: "Cart items" });
    await userEvent.click(within(list).getByRole("button", { name: "Save Product 1 for later" }));
    expect(await screen.findByText("Saved for later (1)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Move .* to cart$/ }));
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(2));
  });

  it("never lets quantity exceed stock", async () => {
    seed([cartItem(1, 1, { stock: 2 })]);
    stubProductApi({ 1: rawProduct(1, { stock: 2 }) });
    renderWithClient(<CartView />);
    await screen.findAllByText("Product 1");
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });
});
