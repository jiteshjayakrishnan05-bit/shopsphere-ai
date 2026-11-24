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

export const firstAvailableVariant = (cfg) => cfg?.options.find((o) => o.available)?.value ?? null;
