import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// jsdom does not provide crypto.subtle; use Node's WebCrypto so password hashing works in tests.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

// Every test starts from a clean admin catalogue and an empty review list (module state would otherwise leak between tests).
import { beforeEach } from "vitest";
import { initialAdminState, useAdminProductsStore } from "@/store/admin-products-store";
import { useReviewsStore } from "@/store/reviews-store";
beforeEach(() => {
  useAdminProductsStore.setState(initialAdminState());
  useReviewsStore.setState({ reviews: [], votes: {} });
});
