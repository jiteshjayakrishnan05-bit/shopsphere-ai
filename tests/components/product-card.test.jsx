import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }) => <img {...props} />,
}));

import { ProductCard } from "@/components/products/product-card";

const base = {
  id: 1, title: "Test Phone", category: "smartphones", price: 20000, originalPrice: 25000,
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
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });
});
