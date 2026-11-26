import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cartItem, hydrateStores, rawProduct, renderWithClient, stubProductApi } from "../helpers";
import { useAuthStore, useCartStore, useOrdersStore, useRecAnalyticsStore, useRecentlyViewedStore, useSearchHistoryStore, useWishlistStore } from "@/store";
import { resetRecommendationProvider, setRecommendationProvider } from "@/services/recommendation/recommendation-provider";
import { STRATEGY } from "@/services/recommendation/recommendation-strategies";

vi.mock("next/image", () => ({ default: ({ fill, priority, ...p }) => <img {...p} /> }));
import { RecommendationRail } from "@/features/recommendations/recommendation-rail";
import { RecentlyViewedRail } from "@/features/recommendations/recently-viewed-rail";
import { PreferencesView } from "@/features/recommendations/preferences-view";

const catalogue = [
  rawProduct(1, { category: "laptops", price: 10, tags: ["laptop"], brand: "Acme" }),
  rawProduct(2, { category: "laptops", price: 12, tags: ["laptop"], brand: "Acme" }),
  rawProduct(3, { category: "beauty", price: 20, tags: ["beauty"] }),
  rawProduct(4, { category: "mobile-accessories", price: 5, tags: ["charger"] }),
  rawProduct(5, { category: "mobile-accessories", price: 6, tags: ["case"], rating: 4.9 }),
  rawProduct(6, { category: "smartphones", price: 30, tags: ["phone"] }),
];

function seed({ viewed = [], wishlist = [], cart = [], terms = [], orders = [], routes = {}, withCatalogue = true } = {}) {
  localStorage.clear();
  useRecentlyViewedStore.setState({ ids: viewed });
  useWishlistStore.setState({ ids: wishlist });
  useCartStore.setState({ items: cart, savedForLater: [], couponCode: null });
  useSearchHistoryStore.setState({ terms });
  useOrdersStore.setState({ orders });
  useRecAnalyticsStore.setState({ stats: {} });
  useAuthStore.setState({ session: null });
  hydrateStores();
  stubProductApi(routes, [], withCatalogue ? catalogue : null);
}
const waitLoaded = () => waitFor(() => expect(screen.queryByLabelText("Loading recommendations")).not.toBeInTheDocument());
afterEach(() => {
  vi.unstubAllGlobals();
  resetRecommendationProvider();
});

describe("RecommendationRail", () => {
  it("explains itself with a title, subtitle and a reason on each card", async () => {
    seed();
    renderWithClient(<RecommendationRail strategy={STRATEGY.trending} limit={4} />);
    expect(await screen.findByRole("heading", { name: "Trending right now" })).toBeInTheDocument();
    expect(screen.getByText(/demo popularity/)).toBeInTheDocument();
    expect(screen.getAllByText("Trending right now").length).toBeGreaterThan(1); // heading + card reasons
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });

  it("shows a popularity fallback with an honest note when there is too little activity", async () => {
    seed({ viewed: [1] }); // one signal is not enough to personalise
    renderWithClient(<RecommendationRail strategy={STRATEGY.personalized} limit={4} />);
    expect(await screen.findByRole("heading", { name: "Popular right now" })).toBeInTheDocument();
    expect(screen.getByText(/little more activity/)).toBeInTheDocument();
    expect(screen.getAllByText("Popular with shoppers").length).toBeGreaterThan(0);
  });

  it("personalises from real activity and adapts when activity changes", async () => {
    seed({ viewed: [1, 2] });
    renderWithClient(<RecommendationRail strategy={STRATEGY.personalized} limit={4} />);
    expect(await screen.findByRole("heading", { name: "Recommended for you" })).toBeInTheDocument();
    const before = screen.getAllByRole("article").map((a) => a.textContent);
    expect(screen.getAllByText(/Because you viewed|Matches your interest|Within your usual|Shares tags|Highly rated/).length).toBeGreaterThan(0);
    useRecentlyViewedStore.setState({ ids: [3, 6] }); // the customer browses something else
    await waitFor(() => expect(screen.getAllByRole("article").map((a) => a.textContent)).not.toEqual(before));
  });

  it("shows because-you-viewed and similar-product reasons", async () => {
    seed({ viewed: [1] });
    renderWithClient(<><RecommendationRail strategy={STRATEGY.becauseViewed} limit={4} /><RecommendationRail strategy={STRATEGY.similar} seed={{ ...catalogue[0], inStock: true, tags: ["laptop"], category: "laptops", price: 840, title: "Product 1" }} limit={4} /></>);
    expect(await screen.findByRole("heading", { name: "Because you viewed Product 1" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Similar products" })).toBeInTheDocument();
  });

  it("shows frequently-bought-together items from the association data", async () => {
    seed();
    const seedProduct = { id: 1, title: "Product 1", category: "laptops", price: 840, rating: 4, inStock: true, tags: [], brand: null, thumbnail: "t.png", stock: 5 };
    renderWithClient(<RecommendationRail strategy={STRATEGY.frequentlyBoughtTogether} seed={seedProduct} limit={4} />);
    expect(await screen.findByRole("heading", { name: "Frequently bought together" })).toBeInTheDocument();
    expect(screen.getAllByText("Often bought with Product 1").length).toBeGreaterThan(0);
  });

  it("renders nothing for a rail with nothing to show (empty wishlist, empty cart)", async () => {
    seed();
    const { container } = renderWithClient(<><RecommendationRail strategy={STRATEGY.wishlist} /><RecommendationRail strategy={STRATEGY.cart} /></>);
    await waitLoaded();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("never breaks the page when the catalogue cannot be loaded", async () => {
    seed({ withCatalogue: false });
    const { container } = renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never breaks the page when the recommendation provider fails", async () => {
    seed();
    setRecommendationProvider({ name: "broken", getRecommendations: async () => { throw new Error("down"); } });
    const { container } = renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe("recommendation analytics tracking", () => {
  let callbacks;
  beforeEach(() => {
    callbacks = [];
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb) { callbacks.push(cb); }
      observe() {}
      disconnect() {}
    });
  });
  const impressions = () => useRecAnalyticsStore.getState().stats.trending?.impressions ?? 0;
  const show = () => callbacks.forEach((cb) => cb([{ isIntersecting: true }]));

  it("counts an impression only when the rail is seen, and only once", async () => {
    seed();
    const view = renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    await screen.findByRole("heading", { name: "Trending right now" });
    expect(impressions()).toBe(0); // rendered but not scrolled into view
    show();
    await waitFor(() => expect(impressions()).toBe(1));
    show();
    view.rerender(view.container.firstChild ? <></> : <></>); // unrelated re-render must not matter
    expect(impressions()).toBe(1);
  });

  it("does not count extra impressions for re-renders of the same rail", async () => {
    seed();
    renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    await screen.findByRole("heading", { name: "Trending right now" });
    show();
    await waitFor(() => expect(impressions()).toBe(1));
    useWishlistStore.setState({ ids: [] }); // store updates re-render consumers
    useRecentlyViewedStore.setState({ ids: [] });
    show();
    expect(impressions()).toBe(1);
  });

  it("counts clicks on products and add-to-cart actions separately", async () => {
    seed();
    const stop = (e) => e.preventDefault(); // keep jsdom from attempting a page navigation
    document.addEventListener("click", stop);
    renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    const rail = (await screen.findByRole("heading", { name: "Trending right now" })).closest("section");
    await userEvent.click(within(rail).getAllByRole("link")[0]);
    expect(useRecAnalyticsStore.getState().stats.trending.clicks).toBe(1);
    await userEvent.click(within(rail).getAllByRole("button", { name: "Add to cart" })[0]);
    expect(useRecAnalyticsStore.getState().stats.trending.addToCarts).toBe(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    document.removeEventListener("click", stop);
  });

  it("works under React StrictMode (as in `npm run dev`) and still counts exactly one impression", async () => {
    seed();
    renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />, { strict: true });
    await screen.findByRole("heading", { name: "Trending right now" });
    show();
    await waitFor(() => expect(impressions()).toBe(1));
    show();
    expect(impressions()).toBe(1);
  });

  it("still counts one impression when IntersectionObserver is unavailable", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    seed();
    renderWithClient(<RecommendationRail strategy={STRATEGY.trending} />);
    await screen.findByRole("heading", { name: "Trending right now" });
    await waitFor(() => expect(impressions()).toBe(1));
  });
});

describe("RecentlyViewedRail", () => {
  it("shows the exact history, most recent first, and drops removed products", async () => {
    seed({ viewed: [3, 1, 2], routes: { 1: rawProduct(1), 2: "404", 3: rawProduct(3) } });
    renderWithClient(<RecentlyViewedRail />);
    const heading = await screen.findByRole("heading", { name: "Recently viewed" });
    await waitFor(() => expect(within(heading.closest("section")).getAllByRole("article")).toHaveLength(2));
    const titles = within(heading.closest("section")).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Product 3", "Product 1"]);
  });
  it("is hidden for a first-time visitor", async () => {
    seed();
    const { container } = renderWithClient(<RecentlyViewedRail />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PreferencesView", () => {
  const orders = [{ id: "O1", userId: "u1", items: [{ productId: 4, quantity: 1 }] }];
  it("explains the signals using the customer's actual activity", async () => {
    seed({ viewed: [1, 2], wishlist: [3], cart: [cartItem(5, 1)], terms: ["laptop"] });
    useAuthStore.setState({ session: { token: "t", expiresAt: Date.now() + 3600000, user: { id: "u1", name: "A", email: "a@b.co", role: "customer" } } });
    useOrdersStore.setState({ orders });
    hydrateStores();
    renderWithClient(<PreferencesView />);
    expect(await screen.findByText(/Active\. We have 5 products of activity/)).toBeInTheDocument();
    expect(screen.getByText(/Because you recently viewed Product 1 and Product 2/)).toBeInTheDocument();
    expect(screen.getByText(/Your wishlist \(1 item, including Product 3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Your cart \(1 item, including Product 5\)/)).toBeInTheDocument();
    expect(screen.getByText(/previous orders \(1 product\)/)).toBeInTheDocument();
    expect(screen.getByText(/searched for “laptop”/)).toBeInTheDocument();
    expect(screen.getByText(/Your typical shopping range is/)).toBeInTheDocument();
    const categories = within(screen.getByRole("list", { name: "Preferred categories" })).getAllByRole("listitem");
    expect(categories.length).toBeGreaterThan(1);
    expect(categories[0]).toHaveTextContent(/%/);
  });

  it("computes the typical price range from real prices", async () => {
    // viewed Product 1 (₹840) + Product 2 (₹1,008), wishlist Product 3 (₹1,680)
    seed({ viewed: [1, 2], wishlist: [3] });
    renderWithClient(<PreferencesView />);
    expect(await screen.findByText(/₹800–₹1,700/)).toBeInTheDocument();
  });

  it("says personalisation is not active yet and shows empty states for a new visitor", async () => {
    seed();
    renderWithClient(<PreferencesView />);
    expect(await screen.findByText(/Not active yet/)).toBeInTheDocument();
    expect(screen.getByText("No price pattern yet.")).toBeInTheDocument();
    expect(screen.getByText("No recently viewed products yet.")).toBeInTheDocument();
    expect(screen.getByText("Your wishlist is empty.")).toBeInTheDocument();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("resets browsing signals only after confirmation and keeps wishlist, cart and orders", async () => {
    seed({ viewed: [1, 2], wishlist: [3], terms: ["laptop"] });
    renderWithClient(<PreferencesView />);
    await userEvent.click(await screen.findByRole("button", { name: "Reset personalisation" }));
    expect(useRecentlyViewedStore.getState().ids).toEqual([1, 2]); // nothing happens until confirmed
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useRecentlyViewedStore.getState().ids).toEqual([1, 2]);
    await userEvent.click(screen.getByRole("button", { name: "Reset personalisation" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, reset" }));
    expect(useRecentlyViewedStore.getState().ids).toEqual([]);
    expect(useSearchHistoryStore.getState().terms).toEqual([]);
    expect(useWishlistStore.getState().ids).toEqual([3]);
    expect(await screen.findByText(/Personalisation reset/)).toBeInTheDocument();
    expect(screen.getByText("No recently viewed products yet.")).toBeInTheDocument();
  });

  it("shows an error state when the catalogue cannot be loaded", async () => {
    seed({ withCatalogue: false });
    renderWithClient(<PreferencesView />);
    expect(await screen.findByText("Couldn't load your preferences")).toBeInTheDocument();
  });
});
