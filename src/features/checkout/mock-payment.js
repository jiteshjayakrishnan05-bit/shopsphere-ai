/**
 * SIMULATED payments (PRD §5.6). This file never handles real card numbers, CVVs, bank logins or UPI PINs.
 * Each method uses clearly labelled TEST inputs, and nothing is sent anywhere.
 */
export const PAYMENT_METHODS = Object.freeze([
  { id: "card", label: "Mock card" },
  { id: "upi", label: "Mock UPI" },
  { id: "cod", label: "Cash on delivery" },
]);

/** Test "cards" are scenarios, not numbers. */
export const TEST_CARDS = Object.freeze([
  { id: "approve", label: "Test card ending 4242 (approves)" },
  { id: "decline", label: "Test card ending 0002 (declines)" },
]);

const TEST_UPI = /^[a-z0-9._-]+@test$/i;

/** @returns {Record<string, string>} field errors (empty when valid) */
export function validatePayment(method, details = {}) {
  const errors = {};
  if (!PAYMENT_METHODS.some((m) => m.id === method)) errors.method = "Choose a payment method.";
  if (method === "card" && !TEST_CARDS.some((c) => c.id === details.testCard)) errors.testCard = "Choose a test card.";
  if (method === "upi" && !TEST_UPI.test(String(details.upiId ?? "").trim())) {
    errors.upiId = "Use a test handle ending in @test, for example success@test.";
  }
  return errors;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pretend to process a payment.
 * - card: "approve" succeeds, "decline" fails
 * - upi: `fail@test` fails, any other `...@test` succeeds
 * - cod: always succeeds, payment stays pending until delivery
 * @returns {Promise<{ok: true, status: "paid"|"cod_pending"} | {ok: false, reason: string}>}
 */
export async function simulatePayment(method, details = {}, { delayMs = 1200 } = {}) {
  if (Object.keys(validatePayment(method, details)).length) return { ok: false, reason: "Please complete the payment details." };
  await wait(delayMs);
  if (method === "cod") return { ok: true, status: "cod_pending" };
  if (method === "card") {
    return details.testCard === "decline"
      ? { ok: false, reason: "The test card was declined. Try another test card or payment method." }
      : { ok: true, status: "paid" };
  }
  return /^fail@test$/i.test(String(details.upiId).trim())
    ? { ok: false, reason: "The test UPI request was declined. Try another test handle or payment method." }
    : { ok: true, status: "paid" };
}
