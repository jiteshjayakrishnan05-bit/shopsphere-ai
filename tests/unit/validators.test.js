import { describe, it, expect } from "vitest";
import {
  isValidEmail, isValidPhone, isValidPincode, isValidPassword, sanitizeSearchQuery, validateReview,
} from "@/lib/validators";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/constants";

describe("validators", () => {
  it("validates email", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
  it("validates Indian mobile numbers", () => {
    expect(isValidPhone("98765 43210")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
  it("validates pincodes", () => {
    expect(isValidPincode("600001")).toBe(true);
    expect(isValidPincode("012345")).toBe(false);
  });
  it("requires 8+ character passwords", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
  });
  it("sanitizes search queries", () => {
    expect(sanitizeSearchQuery("  red   shoes ")).toBe("red shoes");
    expect(sanitizeSearchQuery(null)).toBe("");
    expect(sanitizeSearchQuery("a".repeat(500))).toHaveLength(MAX_SEARCH_QUERY_LENGTH);
  });
  it("validates reviews", () => {
    expect(validateReview({ rating: 5, text: "Really good product" })).toEqual({});
    expect(validateReview({ rating: 0, text: "short" })).toEqual({
      rating: expect.any(String),
      text: expect.any(String),
    });
    expect(validateReview({ rating: 3, text: "x".repeat(1001) }).text).toBeDefined();
  });
});
