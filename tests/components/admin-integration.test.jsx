import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { cartItem, hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAdminProductsStore, useAuthStore, useCartStore } from "@/store";
import { initialAdminState } from "@/store/admin-products-store";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => ({ get: () => null }) }));
import { CartView } from "@/features/cart/cart-view";
import { ProductDetail } from "@/features/products/product-detail";

const store = () => useAdminProductsStore.getState();
function seed({ cart = [] } = {}) {
  localStorage.clear();
  useAuthStore.setState({ session: null });
  useCartStore.setState({ items: cart, savedForLater: [], couponCode: null });
  useAdminProductsStore.setState(initialAdminState());
  hydrateStores();
  stubProductApi({ 1: rawProduct(1, { price: 10, stock: 10 }) }); // ₹840 from the API
}
afterEach(() => vi.unstubAllGlobals());

describe("what the administrator changes is what customers see", () => {
  it("an admin price change shows up on the product page", async () => {
    seed();
    store().saveEdit(1, { price: 2000, discountPercentage: 20 });
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByText("₹2,000")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument(); // original price implied by the 20% discount
    expect(screen.getByText("20% off")).toBeInTheDocument();
  });
  it("an admin price change makes customers confirm the new price in their cart", async () => {
    seed({ cart: [cartItem(1, 1, { price: 840 })] });
    store().saveEdit(1, { price: 2000 });
    renderWithClient(<CartView />);
    expect(await screen.findByText(/The price changed from/)).toBeInTheDocument();
    expect(screen.getByText("₹840")).toBeInTheDocument();
    expect(screen.getAllByText("₹2,000").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Accept new price" })).toBeInTheDocument();
  });
  it("setting stock to zero marks the product out of stock", async () => {
    seed();
    store().setStock(1, 0);
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
  });
  it("an archived product disappears from the store and from carts", async () => {
    seed({ cart: [cartItem(1, 1)] });
    store().archiveProduct(1);
    const view = renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByText("We couldn't find that product")).toBeInTheDocument();
    view.unmount();
    renderWithClient(<CartView />);
    expect(await screen.findByText(/no longer available/)).toBeInTheDocument(); // kept visible with a Remove action
    expect(useCartStore.getState().items).toHaveLength(1); // never silently discarded
  });
  it("a deleted product is gone, and restoring an archived one brings it back", async () => {
    seed();
    store().deleteProduct(1, []);
    const first = renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByText("We couldn't find that product")).toBeInTheDocument();
    first.unmount();
    useAdminProductsStore.setState(initialAdminState());
    store().archiveProduct(1);
    store().restoreProduct(1);
    renderWithClient(<ProductDetail id="1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Product 1" })).toBeInTheDocument();
  });
  it("a product created by the admin has its own working product page, without any network request", async () => {
    seed();
    const id = store().createProduct({ title: "Teak Side Table", description: "A sturdy teak table for any room.", category: "furniture", brand: "Woodcraft", price: 4999, discountPercentage: 0, stock: 6 });
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithClient(<ProductDetail id={String(id)} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Teak Side Table" })).toBeInTheDocument();
    expect(screen.getByText("₹4,999")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await waitFor(() => expect(screen.getAllByText("Woodcraft").length).toBeGreaterThan(0)); // brand line and specifications
    expect(fetchMock.mock.calls.filter(([u]) => /\/products\/\d/.test(String(u)))).toHaveLength(0);
  });
});
