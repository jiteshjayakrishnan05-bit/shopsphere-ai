import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateStores } from "../helpers";
import { useAuthStore, useOrdersStore, useRecAnalyticsStore, useReviewsStore } from "@/store";
import seedOrders from "@/data/orders.json";
import analyticsSeed from "@/data/analytics.json";
import { AdminOrdersView } from "@/features/admin/orders-view";
import { AdminOrderPage } from "@/features/admin/admin-order-page";
import { AnalyticsView } from "@/features/admin/analytics-view";
import { AdminReviewsView } from "@/features/admin/admin-reviews-view";

const admin = { id: "demo-admin", name: "Demo Admin", email: "admin@shopsphere.dev", role: "admin" };
function seed(over = {}) {
  localStorage.clear();
  useAuthStore.setState({ session: { token: "t", expiresAt: Date.now() + 3600000, user: admin } });
  useOrdersStore.setState({ orders: seedOrders, ...over.orders });
  useRecAnalyticsStore.setState({ stats: over.stats ?? {} });
  useReviewsStore.setState({ reviews: over.reviews ?? [], votes: {} });
  hydrateStores();
}
const ids = () => within(screen.getByRole("table", { name: "Orders" })).getAllByRole("link").map((l) => l.textContent);
afterEach(() => vi.unstubAllGlobals());

describe("AdminOrdersView", () => {
  it("lists every order newest first", () => {
    seed();
    render(<AdminOrdersView />);
    expect(screen.getByText("6 orders")).toBeInTheDocument();
    expect(ids()).toEqual(["SS-20261120-DEMO1", "SS-20261118-DEMO2", "SS-20261115-DEMO3", "SS-20261110-DEMO4", "SS-20261105-DEMO5", "SS-20261101-DEMO6"]);
  });
  it("searches by order id, name or email", async () => {
    seed();
    render(<AdminOrdersView />);
    await userEvent.type(screen.getByLabelText("Search"), "demo4");
    expect(ids()).toEqual(["SS-20261110-DEMO4"]);
    await userEvent.clear(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByLabelText("Search"), "customer@shopsphere");
    expect(screen.getByText("6 orders")).toBeInTheDocument();
  });
  it("filters by status and customer, and clears the filters", async () => {
    seed({ orders: { orders: [...seedOrders, { ...seedOrders[0], id: "OTHER-1", userId: "u9", customer: { name: "Zed Buyer", email: "zed@x.co", phone: "9876543210" } }] } });
    render(<AdminOrdersView />);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "delivered");
    expect(ids()).toEqual(["SS-20261101-DEMO6"]);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");
    await userEvent.selectOptions(screen.getByLabelText("Customer"), "u9");
    expect(ids()).toEqual(["OTHER-1"]);
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("7 orders")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });
  it("filters by date range and warns about an inverted range", async () => {
    seed();
    render(<AdminOrdersView />);
    await userEvent.type(screen.getByLabelText("From"), "2026-11-15");
    await userEvent.type(screen.getByLabelText("To"), "2026-11-20");
    expect(ids()).toEqual(["SS-20261118-DEMO2", "SS-20261115-DEMO3", "SS-20261110-DEMO4"].slice(0, 3));
    await userEvent.clear(screen.getByLabelText("To"));
    await userEvent.type(screen.getByLabelText("To"), "2026-11-01");
    expect(screen.getByRole("alert")).toHaveTextContent("start date is after the end date");
    expect(screen.getByText("No orders match these filters.")).toBeInTheDocument();
  });
  it("advances an order one stage at a time and says the change is local", async () => {
    seed();
    render(<AdminOrdersView />);
    await userEvent.click(screen.getByRole("button", { name: "Advance SS-20261120-DEMO1 to Confirmed" }));
    expect(useOrdersStore.getState().orders.find((o) => o.id === "SS-20261120-DEMO1")).toMatchObject({ status: "confirmed" });
    expect(await screen.findByText(/SS-20261120-DEMO1 is now Confirmed\. Changes saved locally in this demo\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance SS-20261120-DEMO1 to Packed" })).toBeInTheDocument();
    const delivered = screen.getAllByRole("row").find((r) => r.textContent.includes("SS-20261101-DEMO6"));
    expect(within(delivered).getByText("Complete")).toBeInTheDocument();
  });
  it("shows an empty state when there are no orders", () => {
    seed({ orders: { orders: [] } });
    render(<AdminOrdersView />);
    expect(screen.getByText("No orders have been placed yet.")).toBeInTheDocument();
  });
  it("opens an order with the admin back link and stage controls", async () => {
    seed();
    render(<AdminOrderPage id="SS-20261110-DEMO4" />);
    expect(screen.getByRole("link", { name: "← All orders (admin)" })).toHaveAttribute("href", "/admin/orders");
    await userEvent.click(screen.getByRole("button", { name: /Advance to “Out for delivery”/ }));
    expect(useOrdersStore.getState().orders.find((o) => o.id === "SS-20261110-DEMO4").status).toBe("out_for_delivery");
  });
});

describe("AnalyticsView", () => {
  const seedTotals = Object.values(analyticsSeed.seedStrategyStats).reduce((t, s) => ({ i: t.i + s.impressions, c: t.c + s.clicks }), { i: 0, c: 0 });
  const local = { trending: { impressions: 10, clicks: 2, addToCarts: 1 }, cart: { impressions: 5, clicks: 5, addToCarts: 0 } };

  it("is clearly labelled as local analytics", () => {
    seed({ stats: local });
    render(<AnalyticsView />);
    expect(screen.getByText("Local Analytics")).toBeInTheDocument();
    expect(screen.getByText("This browser only")).toBeInTheDocument();
  });
  it("adds the demo seed data on request and shows only local activity without it", async () => {
    seed({ stats: local });
    render(<AnalyticsView />);
    const totals = () => screen.getAllByRole("definition").map((d) => d.textContent);
    expect(totals()[0]).toBe(String(15 + seedTotals.i)); // impressions with seed
    await userEvent.click(screen.getByLabelText("Include demo seed data"));
    expect(totals()).toEqual(["15", "7", "46.7%", "1", "6.7%"]); // impressions, clicks, CTR, add to cart, conversion
  });
  it("ranks strategies by clicks and draws one chart row per strategy", async () => {
    seed({ stats: local });
    render(<AnalyticsView />);
    await userEvent.click(screen.getByLabelText("Include demo seed data"));
    const popular = within(screen.getByRole("region", { name: "Most popular strategies" })).getAllByRole("listitem");
    expect(popular[0]).toHaveTextContent("For your cart"); // 5 clicks beats 2
    expect(popular[1]).toHaveTextContent("Trending right now");
    expect(within(screen.getByRole("list", { name: "Click-through rate chart" })).getAllByRole("listitem")).toHaveLength(2);
    const table = screen.getByRole("table", { name: "Recommendation strategy performance" });
    expect(within(table).getByRole("row", { name: /Trending right now/ })).toHaveTextContent("20.0%");
    expect(within(table).getByRole("row", { name: /For your cart/ })).toHaveTextContent("100.0%");
  });
  it("shows an empty state with no data, and clears recorded activity only after confirmation", async () => {
    seed({ stats: local });
    render(<AnalyticsView />);
    await userEvent.click(screen.getByLabelText("Include demo seed data"));
    await userEvent.click(screen.getByRole("button", { name: "Clear recorded activity" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(Object.keys(useRecAnalyticsStore.getState().stats)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Clear recorded activity" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, clear it" }));
    expect(useRecAnalyticsStore.getState().stats).toEqual({});
    expect(screen.getByText(/No recommendation activity recorded yet/)).toBeInTheDocument();
  });
});

describe("AdminReviewsView (moderation)", () => {
  const rv = (id, over = {}) => ({ id, productId: 3, userId: "u1", authorName: id, rating: 4, text: `Text for ${id} review`, createdAt: "2026-11-01T00:00:00.000Z", helpful: 0, notHelpful: 0, ...over });
  it("lists reviews newest first and removes one after confirming", async () => {
    seed({ reviews: [rv("Older", { createdAt: "2026-10-01T00:00:00Z" }), rv("Newer", { createdAt: "2026-11-05T00:00:00Z" })] });
    render(<AdminReviewsView />);
    const items = within(screen.getByRole("list", { name: "All reviews" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Newer");
    await userEvent.click(screen.getByRole("button", { name: "Remove review by Newer on product 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
    expect(useReviewsStore.getState().reviews.map((r) => r.id)).toEqual(["Older"]);
    expect(await screen.findByText(/Review removed\. Changes saved locally in this demo\./)).toBeInTheDocument();
  });
  it("shows an empty state", () => {
    seed();
    render(<AdminReviewsView />);
    expect(screen.getByText(/no customer reviews to moderate/)).toBeInTheDocument();
  });
});
