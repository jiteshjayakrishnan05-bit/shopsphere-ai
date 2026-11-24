import { describe, it, expect, beforeEach } from "vitest";
import { useRecentlyViewedStore } from "@/store/recently-viewed-store";
import { useCompareStore, MAX_COMPARE } from "@/store/compare-store";
import { useWishlistStore } from "@/store/wishlist-store";

beforeEach(() => {
  localStorage.clear();
  useRecentlyViewedStore.setState({ ids: [] });
  useCompareStore.setState({ ids: [] });
  useWishlistStore.setState({ ids: [] });
});

describe("recently viewed", () => {
  it("keeps most-recent-first order without duplicates", () => {
    const { record } = useRecentlyViewedStore.getState();
    record(1); record(2); record(3); record(1);
    expect(useRecentlyViewedStore.getState().ids).toEqual([1, 3, 2]);
  });
  it("caps history length", () => {
    const { record } = useRecentlyViewedStore.getState();
    for (let i = 1; i <= 30; i++) record(i);
    expect(useRecentlyViewedStore.getState().ids).toHaveLength(20);
  });
});

describe("compare", () => {
  it("allows at most four products", () => {
    const { add } = useCompareStore.getState();
    for (let i = 1; i <= MAX_COMPARE; i++) expect(add(i)).toBe(true);
    expect(add(99)).toBe(false);
    expect(useCompareStore.getState().ids).toHaveLength(MAX_COMPARE);
  });
});

describe("wishlist", () => {
  it("toggles ids", () => {
    const { toggle } = useWishlistStore.getState();
    toggle(7);
    expect(useWishlistStore.getState().ids).toEqual([7]);
    toggle(7);
    expect(useWishlistStore.getState().ids).toEqual([]);
  });
});
