/** Minimal normalised product for recommendation tests. */
export const mk = (id, over = {}) => ({
  id, title: `P${id}`, category: "laptops", brand: null, price: 1000, rating: 4, inStock: true, tags: [], stock: 5, thumbnail: "", ...over,
});
