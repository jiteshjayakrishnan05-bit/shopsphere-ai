import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { useCartStore, useWishlistStore } from "@/store";

vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }) => <img {...props} />,
}));

import { ProductCard } from "@/components/products/product-card";

const base = {
  id: 1, stock: 5, title: "Test Phone", category: "smartphones", price: 20000, originalPrice: 25000,
  discountPercentage: 20, rating: 4.4, inStock: true, thumbnail: "t.png",
};

describe("ProductCard", () => {
  it("shows title, price, discount and stock", () => {
    render(<ProductCard product={base} />);
    expect(screen.getByRole("heading", { name: "Test Phone" })).toBeInTheDocument();
    expect(screen.getByText("₹20,000")).toBeInTheDocument();
    expect(screen.getByText("₹25,000")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });
  it("links to the product detail page", () => {
    render(<ProductCard product={base} />);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/products/1");
  });
  it("shows out of stock and hides discount when not discounted", () => {
    render(<ProductCard product={{ ...base, inStock: false, discountPercentage: 0 }} />);
    expect(screen.getAllByText("Out of stock").length).toBeGreaterThan(0);
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  describe("actions", () => {
    beforeEach(() => {
      localStorage.clear();
      useCartStore.setState({ items: [], savedForLater: [] });
      useWishlistStore.setState({ ids: [] });
    });
    it("toggles the wishlist", async () => {
      render(<ProductCard product={base} />);
      const btn = screen.getByRole("button", { name: /Add Test Phone to wishlist/ });
      await userEvent.click(btn);
      expect(useWishlistStore.getState().ids).toEqual([1]);
      expect(screen.getByRole("button", { name: /Remove Test Phone from wishlist/ })).toHaveAttribute("aria-pressed", "true");
      await userEvent.click(screen.getByRole("button", { name: /Remove Test Phone from wishlist/ }));
      expect(useWishlistStore.getState().ids).toEqual([]);
    });
    it("adds to cart and stops at the stock limit", async () => {
      render(<ProductCard product={{ ...base, stock: 2 }} />);
      const add = () => screen.getByRole("button", { name: /Add to cart|Added|Max in cart/ });
      await userEvent.click(add());
      await userEvent.click(add());
      expect(useCartStore.getState().items[0].quantity).toBe(2);
      expect(add()).toBeDisabled();
      expect(add()).toHaveTextContent("Max in cart");
    });
    it("disables add to cart when out of stock", () => {
      render(<ProductCard product={{ ...base, stock: 0, inStock: false }} />);
      expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    });
  });
});
