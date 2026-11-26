/** The nine recommendation strategies required by the PRD. */
export const STRATEGY = Object.freeze({
  becauseViewed: "becauseViewed", // 1. Recently Viewed based
  similar: "similar", // 2. Similar Products
  category: "category", // 3. Category-based
  price: "price", // 4. Price-based
  wishlist: "wishlist", // 5. Wishlist-based
  cart: "cart", // 6. Cart-based
  frequentlyBoughtTogether: "frequentlyBoughtTogether", // 7. Frequently Bought Together
  trending: "trending", // 8. Trending
  personalized: "personalized", // 9. Personalized For You
});

export const STRATEGY_LABELS = Object.freeze({
  becauseViewed: "Because you viewed",
  similar: "Similar products",
  category: "Popular in your category",
  price: "Within your price range",
  wishlist: "Based on your wishlist",
  cart: "For your cart",
  frequentlyBoughtTogether: "Frequently bought together",
  trending: "Trending right now",
  personalized: "Recommended for you",
});

export const STRATEGY_IDS = Object.freeze(Object.keys(STRATEGY));
