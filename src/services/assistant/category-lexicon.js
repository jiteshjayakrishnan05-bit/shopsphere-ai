/**
 * What shoppers can ask for. Each entry maps everyday words to DummyJSON category slugs.
 * Some entries are "virtual": DummyJSON has no headphones category, so `headphones` means the
 * mobile-accessories category narrowed by keywords in the product title or tags.
 */
export const CATEGORY_DEFS = Object.freeze({
  smartphones: { label: "smartphones", slugs: ["smartphones"], synonyms: ["smartphone", "smartphones", "phone", "phones", "mobile", "mobiles", "mobile phone", "mobile phones", "cellphone", "cellphones", "iphone", "iphones"] },
  laptops: { label: "laptops", slugs: ["laptops"], synonyms: ["laptop", "laptops", "notebook", "notebooks", "macbook", "macbooks"] },
  tablets: { label: "tablets", slugs: ["tablets"], synonyms: ["tablet", "tablets", "ipad", "ipads"] },
  headphones: {
    label: "headphones",
    slugs: ["mobile-accessories"],
    keywords: ["headphone", "earphone", "earbud", "airpod", "headset"],
    synonyms: ["headphone", "headphones", "earphone", "earphones", "earbud", "earbuds", "airpods", "headset", "headsets"],
  },
  "mobile-accessories": { label: "mobile accessories", slugs: ["mobile-accessories"], synonyms: ["mobile accessories", "phone accessories", "charger", "chargers", "power bank", "power banks"] },
  watches: { label: "watches", slugs: ["mens-watches", "womens-watches"], synonyms: ["watch", "watches", "wristwatch", "wristwatches"] },
  shoes: { label: "shoes", slugs: ["mens-shoes", "womens-shoes"], synonyms: ["shoe", "shoes", "sneaker", "sneakers", "footwear"] },
  shirts: { label: "shirts", slugs: ["mens-shirts"], synonyms: ["shirt", "shirts"] },
  dresses: { label: "dresses", slugs: ["womens-dresses"], synonyms: ["dress", "dresses", "gown", "gowns"] },
  tops: { label: "tops", slugs: ["tops"], synonyms: ["tops", "tee", "tees", "t-shirt", "t-shirts", "tshirt", "tshirts"] },
  bags: { label: "bags", slugs: ["womens-bags"], synonyms: ["bag", "bags", "handbag", "handbags", "purse", "purses"] },
  jewellery: { label: "jewellery", slugs: ["womens-jewellery"], synonyms: ["jewellery", "jewelry", "necklace", "necklaces", "earrings", "bracelet", "bracelets"] },
  sunglasses: { label: "sunglasses", slugs: ["sunglasses"], synonyms: ["sunglass", "sunglasses", "shades"] },
  beauty: { label: "beauty products", slugs: ["beauty"], synonyms: ["beauty", "makeup", "make-up", "cosmetics", "lipstick", "lipsticks", "mascara", "nail polish"] },
  skincare: { label: "skincare", slugs: ["skin-care"], synonyms: ["skincare", "skin care", "moisturizer", "moisturiser", "serum", "face cream"] },
  fragrances: { label: "fragrances", slugs: ["fragrances"], synonyms: ["fragrance", "fragrances", "perfume", "perfumes", "cologne", "colognes"] },
  furniture: { label: "furniture", slugs: ["furniture"], synonyms: ["furniture", "sofa", "sofas", "chair", "chairs", "table", "tables"] },
  "home-decoration": { label: "home decor", slugs: ["home-decoration"], synonyms: ["decor", "home decor", "home decoration", "decoration", "decorations"] },
  kitchen: { label: "kitchen items", slugs: ["kitchen-accessories"], synonyms: ["kitchen", "kitchenware", "utensils", "cookware"] },
  groceries: { label: "groceries", slugs: ["groceries"], synonyms: ["grocery", "groceries", "food"] },
  vehicles: { label: "vehicles", slugs: ["vehicle"], synonyms: ["car", "cars", "vehicle", "vehicles"] },
  motorcycles: { label: "motorcycles", slugs: ["motorcycle"], synonyms: ["motorcycle", "motorcycles", "bike", "bikes", "motorbike", "motorbikes"] },
  sports: { label: "sports gear", slugs: ["sports-accessories"], synonyms: ["sports", "sports gear", "cricket", "football"] },
});

export const COLOURS = Object.freeze(["black", "white", "red", "blue", "green", "yellow", "pink", "purple", "orange", "brown", "grey", "gray", "silver", "gold", "beige", "tortoise"]);

/** Prompts that are known to work. Shown as starter chips and as fallback suggestions. */
export const STARTER_PROMPTS = Object.freeze([
  "Show me smartphones under 30000 rupees",
  "Headphones under 5000 with good ratings",
  "Show me laptops below 60k",
  "Sunglasses in blue",
]);
