import { describe, it, expect } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("allows same-site paths with queries", () => expect(safeRedirect("/checkout?step=2")).toBe("/checkout?step=2"));
  it("blocks external and protocol-relative URLs", () => {
    expect(safeRedirect("https://evil.com")).toBe("/");
    expect(safeRedirect("//evil.com")).toBe("/");
    expect(safeRedirect("/\\evil.com")).toBe("/");
  });
  it("blocks redirect loops to auth pages and non-strings", () => {
    expect(safeRedirect("/login")).toBe("/");
    expect(safeRedirect(null)).toBe("/");
    expect(safeRedirect(undefined, "/home")).toBe("/home");
  });
});
