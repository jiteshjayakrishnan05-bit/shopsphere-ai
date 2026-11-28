import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores, rawProduct, renderWithClient } from "../helpers";
import { useAdminProductsStore, useAuthStore, useOrdersStore, useRecAnalyticsStore, useUsersStore } from "@/store";
import { initialAdminState } from "@/store/admin-products-store";
import seedOrders from "@/data/orders.json";

let pathname = "/admin";
vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => pathname, useSearchParams: () => ({ get: () => null }) }));

import { AdminShell } from "@/features/admin/admin-shell";
import { OverviewView } from "@/features/admin/overview-view";
import { AdminProductsView } from "@/features/admin/products-view";
import { AdminProductEditor } from "@/features/admin/product-editor";
import { AdminCategoriesView } from "@/features/admin/categories-view";

const admin = { id: "demo-admin", name: "Demo Admin", email: "admin@shopsphere.dev", role: "admin" };
const customer = { id: "demo-customer", name: "Demo Customer", email: "customer@shopsphere.dev", role: "customer" };
const ok = (json) => ({ ok: true, json: async () => json });

// 30 products: Item 1-10 laptops, 11-20 beauty, 21-30 furniture. Item 3 is out of stock, 4 and 5 are low.
const catalogue = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1;
  return rawProduct(id, { title: `Item ${id}`, category: id <= 10 ? "laptops" : id <= 20 ? "beauty" : "furniture", price: 10 + id, stock: id === 3 ? 0 : id === 4 ? 2 : id === 5 ? 4 : 20 });
});
const categories = [{ slug: "laptops", name: "Laptops" }, { slug: "beauty", name: "Beauty" }, { slug: "furniture", name: "Furniture" }];

function stubApi() {
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    const u = String(url);
    if (u.includes("/products/categories")) return ok(categories);
    if (/\/products\?/.test(u) && !u.includes("/products/")) return ok({ products: catalogue, total: 30, skip: 0, limit: 0 });
    const m = u.match(/\/products\/(\d+)/);
    const p = m && catalogue.find((x) => x.id === Number(m[1]));
    return p ? ok(p) : { ok: false, status: 404 };
  }));
}
function seed({ user = admin, orders = seedOrders } = {}) {
  localStorage.clear();
  pathname = "/admin";
  useAuthStore.setState({ session: user ? { token: "t", expiresAt: Date.now() + 3600000, user } : null });
  useOrdersStore.setState({ orders });
  useUsersStore.setState({ users: [] });
  useRecAnalyticsStore.setState({ stats: {} });
  useAdminProductsStore.setState(initialAdminState());
  hydrateStores();
  stubApi();
}
const store = () => useAdminProductsStore.getState();
const rowOf = async (title) => (await screen.findByRole("link", { name: title })).closest("tr");
afterEach(() => vi.unstubAllGlobals());

describe("AdminShell (access and navigation)", () => {
  it("shows the admin navigation and the local-changes notice to administrators", async () => {
    seed();
    pathname = "/admin/products";
    renderWithClient(<AdminShell><p>child page</p></AdminShell>);
    expect(await screen.findByText("child page")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Administrator" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Overview", "Products", "Categories", "Orders", "Reviews", "Analytics"]);
    expect(within(nav).getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("note")).toHaveTextContent(/saved locally in this browser, not in a production database/);
  });
  it("denies customers and shows no admin content", async () => {
    seed({ user: customer });
    renderWithClient(<AdminShell><p>secret admin page</p></AdminShell>);
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.queryByText("secret admin page")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Administrator" })).not.toBeInTheDocument();
  });
});

describe("OverviewView", () => {
  it("shows totals, simulated metrics, top products, low-stock alerts and recent activity", async () => {
    seed();
    useRecAnalyticsStore.setState({ stats: { trending: { impressions: 10, clicks: 2, addToCarts: 1 } } });
    renderWithClient(<OverviewView />);
    await screen.findByText("30"); // total products once the catalogue loads
    const card = (label) => screen.getByText(label).closest("div");
    expect(card("Total orders")).toHaveTextContent("6");
    expect(card("Total customers")).toHaveTextContent("1");
    expect(within(card("Revenue")).getByText("Simulated")).toBeInTheDocument();
    expect(within(card("Conversion rate")).getByText("Simulated")).toBeInTheDocument();
    const top = within(screen.getByRole("region", { name: "Top-performing products" }));
    expect(top.getAllByRole("listitem")[0]).toHaveTextContent("3 sold");
    const low = within(screen.getByRole("region", { name: "Low-stock alerts" }));
    expect(low.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Item 3Out of stock", "Item 4" + "2 left", "Item 5" + "4 left"]);
    expect(within(screen.getByRole("region", { name: "Recent activity" })).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByText("Includes demo seed data")).toBeInTheDocument();
  });
  it("counts registered customers too", async () => {
    seed();
    useUsersStore.setState({ users: [{ id: "u1", name: "A", email: "a@x.co", role: "customer", passwordHash: "x" }] });
    renderWithClient(<OverviewView />);
    await waitFor(() => expect(screen.getByText("Total customers").closest("div")).toHaveTextContent("2"));
  });
  it("still shows order metrics when the catalogue fails, with a retry", async () => {
    seed();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    renderWithClient(<OverviewView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load the catalogue/);
    expect(screen.getByText("Total orders").closest("div")).toHaveTextContent("6");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("AdminProductsView", () => {
  it("lists products 25 at a time with pagination", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    expect(await screen.findByText("30 products")).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Products" })).getAllByRole("row")).toHaveLength(26); // header + 25
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(within(screen.getByRole("table", { name: "Products" })).getAllByRole("row")).toHaveLength(6);
  });
  it("searches and filters by category and stock", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    await screen.findByText("30 products");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "furniture");
    expect(screen.getByText("10 products")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Category"), "all");
    await userEvent.selectOptions(screen.getByLabelText("Stock"), "out");
    expect(screen.getByText("1 product")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Item 3" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Stock"), "low");
    expect(screen.getByText("2 products")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Stock"), "all");
    await userEvent.type(screen.getByLabelText("Search"), "item 17");
    expect(screen.getByText("1 product")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByLabelText("Search"), "zzz nothing");
    expect(await screen.findByText("No products match these filters.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("30 products")).toBeInTheDocument();
  });
  it("updates stock inline, validates input, and says the change is local", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    const input = await screen.findByLabelText("Stock for Item 7");
    await userEvent.clear(input);
    await userEvent.type(input, "-4");
    await userEvent.click(screen.getByRole("button", { name: "Update stock for Item 7" }));
    expect(await screen.findByText(/Whole number, 0 to 1,00,000/)).toBeInTheDocument();
    expect(store().edits[7]).toBeUndefined();
    await userEvent.clear(input);
    await userEvent.type(input, "15");
    await userEvent.click(screen.getByRole("button", { name: "Update stock for Item 7" }));
    expect(store().edits[7].stock).toBe(15);
    expect(await screen.findByText("Stock for Item 7 is now 15. Changes saved locally in this demo.")).toBeInTheDocument();
  });
  it("archives and restores a product", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Archive Item 8" }));
    expect(store().archivedIds).toEqual([8]);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Item 8" })).not.toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText("Status"), "archived");
    const row = await rowOf("Item 8");
    expect(within(row).getByText("Archived")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Restore Item 8" }));
    expect(store().archivedIds).toEqual([]);
  });
  it("deletes a product that no order uses, after confirming", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Item 12" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store().deletedIds).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: "Delete Item 12" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(store().deletedIds).toEqual([12]);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Item 12" })).not.toBeInTheDocument());
    expect(screen.getByText(/Item 12 deleted\. Changes saved locally in this demo\./)).toBeInTheDocument();
  });
  it("blocks deleting a product that an order references and offers to archive it instead", async () => {
    seed();
    renderWithClient(<AdminProductsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Item 1" })); // Item 1 is in two seed orders
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't delete: this product is in 2 orders");
    expect(store().deletedIds).toEqual([]);
    expect(screen.queryByRole("button", { name: "Yes, delete" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Archive instead" }));
    expect(store().archivedIds).toEqual([1]);
    expect(store().deletedIds).toEqual([]);
    expect(seedOrders.some((o) => o.items.some((i) => i.productId === 1))).toBe(true); // order history intact
  });
  it("shows an error with retry when the catalogue cannot load", async () => {
    seed();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    renderWithClient(<AdminProductsView />);
    expect(await screen.findByText("Couldn't load products")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("AdminProductEditor", () => {
  it("validates and creates a new product, saved locally", async () => {
    seed();
    renderWithClient(<AdminProductEditor />);
    await userEvent.click(await screen.findByRole("button", { name: "Create product" }));
    for (const msg of ["Enter a title of 3 to 120 characters.", "Enter a description of 10 to 1,000 characters.", "Choose a category.", /Enter a price above/, /Enter a whole number from 0/]) expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(store().created).toHaveLength(0);
    await userEvent.type(screen.getByLabelText("Title"), "Teak Side Table");
    await userEvent.type(screen.getByLabelText("Description"), "A sturdy teak table for any room.");
    await userEvent.selectOptions(await screen.findByLabelText("Category"), "furniture");
    await userEvent.type(screen.getByLabelText("Price (₹)"), "4999");
    await userEvent.type(screen.getByLabelText("Discount (%)"), "10");
    await userEvent.type(screen.getByLabelText("Stock"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByText(/Teak Side Table created\. Changes saved locally in this demo\./)).toBeInTheDocument();
    expect(store().created[0]).toMatchObject({ id: 100001, title: "Teak Side Table", category: "furniture", price: 4999, discountPercentage: 10, stock: 12 });
    expect(screen.getByRole("link", { name: "View in store" })).toHaveAttribute("href", "/products/100001");
    expect(screen.getByLabelText("Title")).toHaveValue(""); // form is cleared for the next product
  });
  it("edits an imported product but keeps its category fixed", async () => {
    seed();
    renderWithClient(<AdminProductEditor id="7" />);
    expect(await screen.findByRole("heading", { name: "Item 7" })).toBeInTheDocument();
    expect(screen.getByText(/imported products keep their category/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Price (₹)"));
    await userEvent.type(screen.getByLabelText("Price (₹)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Enter a price above/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Price (₹)"));
    await userEvent.type(screen.getByLabelText("Price (₹)"), "1500");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved locally in this demo.")).toBeInTheDocument();
    expect(store().edits[7]).toMatchObject({ price: 1500 });
    expect(store().edits[7]).not.toHaveProperty("category");
  });
  it("shows how many orders use a product and lets created products change category", async () => {
    seed();
    const id = store().createProduct({ title: "Made Here", description: "Created in the admin area.", category: "beauty", brand: null, price: 500, discountPercentage: 0, stock: 3 });
    renderWithClient(<AdminProductEditor id={String(id)} />);
    expect(await screen.findByLabelText("Category")).toHaveValue("beauty");
    renderWithClient(<AdminProductEditor id="1" />);
    expect(await screen.findByText("2", { selector: "dd" })).toBeInTheDocument(); // Item 1 appears in 2 orders
  });
  it("handles a product that does not exist", async () => {
    seed();
    renderWithClient(<AdminProductEditor id="9999" />);
    expect(await screen.findByText("Product not found")).toBeInTheDocument();
  });
});

describe("AdminCategoriesView", () => {
  it("lists built-in categories with product counts and no edit actions", async () => {
    seed();
    renderWithClient(<AdminCategoriesView />);
    const list = await screen.findByRole("list", { name: "Categories" });
    await waitFor(() => expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("10 products"));
    expect(within(list).getAllByText("Built-in")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Rename|Delete/ })).not.toBeInTheDocument();
  });
  it("adds, validates, renames and removes custom categories", async () => {
    seed();
    renderWithClient(<AdminCategoriesView />);
    await screen.findByRole("list", { name: "Categories" });
    await userEvent.type(screen.getByLabelText("New category name"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 2 characters");
    await userEvent.clear(screen.getByLabelText("New category name"));
    await userEvent.type(screen.getByLabelText("New category name"), "Beauty");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    await userEvent.clear(screen.getByLabelText("New category name"));
    await userEvent.type(screen.getByLabelText("New category name"), "Garden Tools");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByText(/Category “Garden Tools” added\. Changes saved locally in this demo\./)).toBeInTheDocument();
    expect(store().customCategories).toEqual([{ slug: "garden-tools", name: "Garden Tools" }]);

    await userEvent.click(await screen.findByRole("button", { name: "Rename Garden Tools" }));
    await userEvent.clear(screen.getByLabelText("New name for Garden Tools"));
    await userEvent.type(screen.getByLabelText("New name for Garden Tools"), "Outdoor Tools");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Outdoor Tools")).toBeInTheDocument();

    store().createProduct({ title: "Spade", description: "A garden spade for digging.", category: "outdoor-tools", brand: null, price: 400, discountPercentage: 0, stock: 5 });
    await userEvent.click(await screen.findByRole("button", { name: "Delete Outdoor Tools" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("still has products");
    store().deleteProduct(100001, []);
    await userEvent.click(screen.getByRole("button", { name: "Delete Outdoor Tools" }));
    expect(await screen.findByText(/Category removed/)).toBeInTheDocument();
    expect(store().customCategories).toEqual([]);
  });
});

describe("React StrictMode (as in npm run dev)", () => {
  it("updates stock once and creates a product once", async () => {
    seed();
    const view = renderWithClient(<AdminProductsView />, { strict: true });
    const input = await screen.findByLabelText("Stock for Item 7");
    await userEvent.clear(input);
    await userEvent.type(input, "9");
    await userEvent.click(screen.getByRole("button", { name: "Update stock for Item 7" }));
    expect(store().edits[7].stock).toBe(9);
    view.unmount();
    renderWithClient(<AdminProductEditor />, { strict: true });
    await userEvent.type(await screen.findByLabelText("Title"), "Strict Lamp");
    await userEvent.type(screen.getByLabelText("Description"), "A lamp created under strict mode.");
    await userEvent.selectOptions(await screen.findByLabelText("Category"), "furniture");
    await userEvent.type(screen.getByLabelText("Price (₹)"), "999");
    await userEvent.type(screen.getByLabelText("Stock"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));
    await screen.findByText(/Strict Lamp created/);
    expect(store().created).toHaveLength(1);
  });
});
