/**
 * Specifications built only from fields DummyJSON actually returns. Missing fields are skipped,
 * never invented.
 * @param {import("@/services/api/normalize-product").Product} product
 * @returns {{label: string, value: string}[]}
 */
export function buildSpecifications(product) {
  const r = product.raw ?? {};
  const d = r.dimensions;
  const rows = [
    ["Brand", product.brand],
    ["Category", product.category],
    ["SKU", product.sku],
    ["Weight", r.weight != null ? String(r.weight) : null],
    ["Dimensions (W × H × D)", d && d.width != null ? [d.width, d.height, d.depth].map((n) => Number(n).toFixed(2)).join(" × ") : null],
    ["Warranty", r.warrantyInformation],
    ["Shipping", r.shippingInformation],
    ["Returns", r.returnPolicy],
    ["Minimum order", r.minimumOrderQuantity != null ? String(r.minimumOrderQuantity) : null],
    ["Availability", r.availabilityStatus],
  ];
  return rows.filter(([, v]) => v != null && v !== "").map(([label, value]) => ({ label, value: String(value) }));
}
