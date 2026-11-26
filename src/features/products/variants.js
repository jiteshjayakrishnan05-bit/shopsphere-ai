import config from "@/data/variants.json";

/**
 * Variant options for a product, from the documented local fixture (data/variants.json).
 * Returns null for categories without variants. Out-of-stock products have every option unavailable.
 * @returns {{label: string, options: {value: string, available: boolean}[]} | null}
 */
export function getVariantConfig(product) {
  const c = config.categories[product.category];
  if (!c) return null;
  return {
    label: c.label,
    options: c.options.map((value, i) => ({
      value,
      available: product.inStock && (product.id + i) % config.unavailableModulo !== 0,
    })),
  };
}

/**
 * Does the product come in this colour? True when the demo variant fixture lists it as an available option
 * (e.g. sunglasses) or the product text names the colour as a whole word. No colour data is invented.
 */
export function matchesColour(product, colour) {
  const c = String(colour).toLowerCase();
  const cfg = getVariantConfig(product);
  if (cfg?.label === "Colour" && cfg.options.some((o) => o.available && o.value.toLowerCase() === c)) return true;
  const hay = `${product.title} ${product.description ?? ""}`.toLowerCase();
  return new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(hay);
}

export const firstAvailableVariant = (cfg) => cfg?.options.find((o) => o.available)?.value ?? null;
