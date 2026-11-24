import { MAX_SEARCH_QUERY_LENGTH } from "./constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile
const PINCODE_RE = /^[1-9]\d{5}$/;

export const isValidEmail = (v) => EMAIL_RE.test(String(v ?? "").trim());
export const isValidPhone = (v) => PHONE_RE.test(String(v ?? "").replace(/[\s-]/g, ""));
export const isValidPincode = (v) => PINCODE_RE.test(String(v ?? "").trim());
export const isValidPassword = (v) => String(v ?? "").length >= 8;

/**
 * Normalise a search query: trim, collapse whitespace, cap length.
 * Returns "" for empty input so callers can skip the request.
 */
export function sanitizeSearchQuery(raw) {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/** Validate a review. Returns an object of field errors (empty when valid). */
export function validateReview({ rating, text }) {
  const errors = {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) errors.rating = "Choose a rating from 1 to 5.";
  const len = String(text ?? "").trim().length;
  if (len < 10) errors.text = "Write at least 10 characters.";
  else if (len > 1000) errors.text = "Keep your review under 1,000 characters.";
  return errors;
}
