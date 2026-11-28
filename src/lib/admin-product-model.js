import { originalPriceFrom } from "./formatters";

/** Products created by an administrator get ids from here up, far above DummyJSON's own ids. */
export const FIRST_CREATED_ID = 100001;

export const slugify = (name) =>
  String(name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Fields an administrator may change on a product imported from DummyJSON (its category stays fixed). */
export const EDITABLE_API_FIELDS = ["title", "description", "brand", "price", "discountPercentage", "stock"];

/** Rebuild the derived fields after a price, discount or stock change. */
export function withDerived(product) {
  const price = Math.max(0, Math.round(Number(product.price) || 0));
  const discountPercentage = Math.max(0, Math.min(90, Math.round(Number(product.discountPercentage) || 0)));
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  return { ...product, price, discountPercentage, originalPrice: originalPriceFrom(price, discountPercentage), stock, inStock: stock > 0 };
}

/** Apply a stored admin edit on top of a normalised DummyJSON product. */
export function applyEdit(product, state) {
  const edit = state.edits[product.id];
  return edit ? withDerived({ ...product, ...edit }) : product;
}

export const isHidden = (id, state) => state.deletedIds.includes(id) || state.archivedIds.includes(id);

/** Build a product in the same shape as a normalised DummyJSON product. */
export function buildCreatedProduct(id, fields, now = new Date()) {
  return withDerived({
    id,
    title: String(fields.title).trim(),
    description: String(fields.description ?? "").trim(),
    category: fields.category,
    brand: fields.brand ? String(fields.brand).trim() : null,
    price: fields.price,
    discountPercentage: fields.discountPercentage ?? 0,
    rating: 0,
    stock: fields.stock,
    tags: [],
    thumbnail: "",
    images: [],
    sku: `SS-${id}`,
    createdAt: now.toISOString(),
    raw: {},
  });
}
