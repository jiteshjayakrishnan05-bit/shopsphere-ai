import { describe, it, expect } from "vitest";
import { estimateDelivery } from "@/features/products/delivery";
import { buildSpecifications } from "@/features/products/specs";
import { getVariantConfig, firstAvailableVariant } from "@/features/products/variants";

describe("estimateDelivery (simulated)", () => {
  const from = new Date(2026, 10, 24);
  it("rejects invalid pincodes", () => {
    for (const p of ["", "12345", "012345", "abcdef", "1234567"]) expect(estimateDelivery(p, from).valid).toBe(false);
  });
  it("gives faster estimates for metro prefixes", () => {
    const r = estimateDelivery("600001", from);
    expect(r).toMatchObject({ valid: true, zone: "metro", minDays: 1, maxDays: 3 });
    expect(r.minDate).toEqual(new Date(2026, 10, 25));
    expect(r.maxDate).toEqual(new Date(2026, 10, 27));
  });
  it("gives longer estimates for remote and standard zones", () => {
    expect(estimateDelivery("795001", from)).toMatchObject({ zone: "remote", minDays: 5 });
    expect(estimateDelivery("302001", from)).toMatchObject({ zone: "standard", minDays: 3 });
  });
});

describe("buildSpecifications", () => {
  it("uses only fields that exist", () => {
    const specs = buildSpecifications({
      brand: "Acme", category: "laptops", sku: "X1",
      raw: { weight: 4, dimensions: { width: 1, height: 2.5, depth: 3 }, warrantyInformation: "1 year" },
    });
    expect(specs).toEqual([
      { label: "Brand", value: "Acme" },
      { label: "Category", value: "laptops" },
      { label: "SKU", value: "X1" },
      { label: "Weight", value: "4" },
      { label: "Dimensions (W × H × D)", value: "1.00 × 2.50 × 3.00" },
      { label: "Warranty", value: "1 year" },
    ]);
  });
  it("skips missing values entirely", () => {
    expect(buildSpecifications({ brand: null, category: "x", sku: null, raw: {} })).toEqual([{ label: "Category", value: "x" }]);
  });
});

describe("variants (demo fixture)", () => {
  it("returns null for categories without variants", () => {
    expect(getVariantConfig({ id: 1, category: "laptops", inStock: true })).toBeNull();
  });
  it("is deterministic and marks some options unavailable", () => {
    const a = getVariantConfig({ id: 7, category: "mens-shirts", inStock: true });
    expect(a.label).toBe("Size");
    expect(a.options.map((o) => o.available)).toEqual([false, true, true, true]); // (7+0)%7 === 0
    expect(getVariantConfig({ id: 7, category: "mens-shirts", inStock: true })).toEqual(a);
    expect(firstAvailableVariant(a)).toBe("M");
  });
  it("makes every option unavailable when the product is out of stock", () => {
    const c = getVariantConfig({ id: 1, category: "sunglasses", inStock: false });
    expect(c.options.every((o) => !o.available)).toBe(true);
    expect(firstAvailableVariant(c)).toBeNull();
  });
});
