import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// jsdom does not provide crypto.subtle; use Node's WebCrypto so password hashing works in tests.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
