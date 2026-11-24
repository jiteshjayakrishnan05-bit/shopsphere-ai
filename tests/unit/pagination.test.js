import { describe, it, expect } from "vitest";
import { pageWindow } from "@/features/products/pagination";

describe("pageWindow", () => {
  it("lists all pages when there are few", () => expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]));
  it("adds ellipses for long ranges", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  });
});
