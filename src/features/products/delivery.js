/**
 * SIMULATED delivery estimate from an Indian pincode. No real carrier or location data is used.
 * Metro pincode prefixes get faster estimates; other regions get longer ones.
 */
const METRO_PREFIXES = new Set(["11", "40", "56", "60", "70", "50", "41", "38"]);

/** Calendar date `n` days after `from` (time of day dropped). */
export const addDays = (from, n) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);

/** @returns {{valid: false} | {valid: true, minDays: number, maxDays: number, minDate: Date, maxDate: Date, zone: "metro"|"standard"|"remote"}} */
export function estimateDelivery(pincode, from = new Date()) {
  const pin = String(pincode ?? "").trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { valid: false };
  let zone = "standard";
  let minDays = 3;
  let maxDays = 5;
  if (METRO_PREFIXES.has(pin.slice(0, 2))) {
    zone = "metro";
    minDays = 1;
    maxDays = 3;
  } else if (["7", "8", "9"].includes(pin[0])) {
    zone = "remote";
    minDays = 5;
    maxDays = 8;
  }
  return { valid: true, minDays, maxDays, minDate: addDays(from, minDays), maxDate: addDays(from, maxDays), zone };
}

export const formatDeliveryDate = (d) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(d);
