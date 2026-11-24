import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useCartStore, useWishlistStore } from "@/store";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
import { WishlistView } from "@/features/wishlist/wishlist-view";

const seed = (ids) => {
  localStorage.clear();
  useWishlistStore.setState({ ids });
  useCartStore.setState({ items: [], savedForLater: [], couponCode: null });
  hydrateStores();
};
afterEach(() => vi.unstubAllGlobals());

describe("WishlistView", () => {
  it("shows an empty state", async () => {
    seed([]);
    stubProductApi({});
    renderWithClient(<WishlistView />);
    expect(await screen.findByText("Your wishlist is empty")).toBeInTheDocument();
  });
  it("shows current price and stock, and moves an in-stock item to the cart", async () => {
    seed([1]);
    stubProductApi({ 1: rawProduct(1, { price: 10 }) });
    renderWithClient(<WishlistView />);
    expect(await screen.findByText("₹840")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Move Product 1 to cart" }));
    expect(useCartStore.getState().items).toHaveLength(1);
    await waitFor(() => expect(useWishlistStore.getState().ids).toEqual([]));
  });
  it("keeps an out-of-stock item, disables Move to cart, and flags removed products", async () => {
    seed([2, 3]);
    stubProductApi({ 2: rawProduct(2, { stock: 0 }), 3: "404" });
    renderWithClient(<WishlistView />);
    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
    expect(await screen.findByText("This product is no longer available.")).toBeInTheDocument();
    expect(useWishlistStore.getState().ids).toEqual([2, 3]); // never silently dropped
  });
  it("removes an item", async () => {
    seed([1]);
    stubProductApi({ 1: rawProduct(1) });
    renderWithClient(<WishlistView />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Product 1 from wishlist" }));
    expect(useWishlistStore.getState().ids).toEqual([]);
  });
});
