/**
 * Validate and convert the admin product form. All form fields arrive as strings.
 * @param {Record<string, string>} values
 * @param {{categorySlugs: string[], editsCategory: boolean}} options `editsCategory` is false for imported DummyJSON products
 * @returns {{errors: Record<string, string>, value: object}}
 */
export function parseProductForm(values, { categorySlugs = [], editsCategory = true } = {}) {
  const errors = {};
  const title = String(values.title ?? "").trim();
  const description = String(values.description ?? "").trim();
  const brand = String(values.brand ?? "").trim();
  const price = Number(values.price);
  const discountRaw = String(values.discountPercentage ?? "").trim();
  const discount = discountRaw === "" ? 0 : Number(discountRaw);
  const stockRaw = String(values.stock ?? "").trim();
  const stock = Number(stockRaw);

  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  if (description.length < 10 || description.length > 1000) errors.description = "Enter a description of 10 to 1,000 characters.";
  if (brand.length > 60) errors.brand = "Keep the brand under 60 characters.";
  if (editsCategory && !categorySlugs.includes(values.category)) errors.category = "Choose a category.";
  if (!(price > 0) || price > 10_000_000) errors.price = "Enter a price above ₹0 and up to ₹1,00,00,000.";
  if (!Number.isFinite(discount) || discount < 0 || discount > 90) errors.discountPercentage = "Enter a discount from 0 to 90.";
  if (stockRaw === "" || !Number.isInteger(stock) || stock < 0 || stock > 100000) errors.stock = "Enter a whole number from 0 to 1,00,000.";

  return {
    errors,
    value: { title, description, brand: brand || null, category: values.category, price: Math.round(price), discountPercentage: Math.round(discount), stock },
  };
}
