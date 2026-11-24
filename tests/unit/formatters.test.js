import { describe, it, expect } from "vitest";
import { toInr, formatPrice, originalPriceFrom, discountPercent, truncate, formatCategory } from "@/lib/formatters";

describe("formatters", () => {
  it("converts USD to demo INR with the fixed rate", () => {
    expect(toInr(10)).toBe(840);
    expect(toInr(-5)).toBe(0);
    expect(toInr("abc")).toBe(0);
  });
  it("formats INR with Indian digit grouping", () => {
    expect(formatPrice(150000)).toBe("₹1,50,000");
    expect(formatPrice(NaN)).toBe("₹0");
  });
  it("derives the original price from a discount", () => {
    expect(originalPriceFrom(800, 20)).toBe(1000);
    expect(originalPriceFrom(800, 0)).toBe(800);
    expect(originalPriceFrom(800, 100)).toBe(800);
  });
  it("calculates discount percentage", () => {
    expect(discountPercent(1000, 800)).toBe(20);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(0, 10)).toBe(0);
  });
  it("truncates long text", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
  it("formats category slugs", () => {
    expect(formatCategory("mens-shirts")).toBe("Mens Shirts");
  });
});
