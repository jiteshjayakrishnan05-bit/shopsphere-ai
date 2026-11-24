import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPanel } from "@/features/products/filter-panel";

const facets = {
  categories: [{ value: "laptops", count: 3 }, { value: "phones", count: 2 }],
  brands: [{ value: "Acme", count: 4 }],
  priceBounds: { min: 0, max: 1000 },
};
const params = { q: "", categories: [], brands: [], minPrice: null, maxPrice: null, minRating: null, stock: "all", onSale: false, sort: "relevance", page: 1 };

describe("FilterPanel", () => {
  it("emits category, brand, rating, stock and sale changes", async () => {
    const onChange = vi.fn();
    render(<FilterPanel facets={facets} params={params} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/Laptops/));
    expect(onChange).toHaveBeenLastCalledWith({ categories: ["laptops"] });
    await userEvent.click(screen.getByLabelText(/Acme/));
    expect(onChange).toHaveBeenLastCalledWith({ brands: ["Acme"] });
    await userEvent.click(screen.getByLabelText("4 stars & up"));
    expect(onChange).toHaveBeenLastCalledWith({ minRating: 4 });
    await userEvent.click(screen.getByLabelText("In stock"));
    expect(onChange).toHaveBeenLastCalledWith({ stock: "in" });
    await userEvent.click(screen.getByLabelText("On sale only"));
    expect(onChange).toHaveBeenLastCalledWith({ onSale: true });
  });
  it("applies a price range on Enter", async () => {
    const onChange = vi.fn();
    render(<FilterPanel facets={facets} params={params} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Minimum price"), "100");
    await userEvent.type(screen.getByLabelText("Maximum price"), "500{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ minPrice: 100, maxPrice: 500 });
  });
  it("rejects an inverted price range with a message", async () => {
    const onChange = vi.fn();
    render(<FilterPanel facets={facets} params={params} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Minimum price"), "900");
    await userEvent.type(screen.getByLabelText("Maximum price"), "100{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Minimum can't be higher than maximum.");
    // Only the valid single bound was applied (when leaving the min field); the inverted pair never is.
    expect(onChange).not.toHaveBeenCalledWith({ minPrice: 900, maxPrice: 100 });
  });
  it("hides the category group when browsing a single category", () => {
    render(<FilterPanel facets={facets} params={params} onChange={() => {}} showCategories={false} />);
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });
});
