# ShopSphere AI — Personalized Shopping, Powered by Intelligence

Frontend internship project: a production-style e-commerce storefront built with Next.js (App Router), React, Tailwind CSS,
TanStack Query and Zustand. Data comes from the free DummyJSON API plus documented local fixtures. No backend, no paid services.

> Status: **Phases 1-7 complete** (foundation, auth, discovery, product detail, cart, wishlist, Quick View, Compare, six-step checkout, orders and tracking, saved addresses, recommendation engine, shopping assistant, administrator dashboard, reviews). Remaining: end-to-end tests, accessibility and performance polish, and final documentation.

## Stack
Next.js 16 · React 19 · JavaScript/JSX · Tailwind CSS 4 · TanStack Query 5 · Zustand 5 · Lucide · Vitest · React Testing Library · Playwright

## Run it
```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # unit + component tests
npm run test:e2e   # Playwright (run `npx playwright install` once first)
```

## Key decisions
- **State split:** TanStack Query = server data (products, categories, search). Zustand = client state (cart, wishlist, auth session, checkout progress, recently viewed, compare). Stores hold IDs/snapshots, never full API datasets.
- **SSR-safe persistence:** persisted stores use `skipHydration` and are rehydrated after mount by `StoreHydrator`, which also syncs tabs through the `storage` event.
- **Currency:** DummyJSON prices are USD; the UI shows INR using one fixed demo rate (`USD_TO_INR_RATE` in `src/lib/constants.js`). It is not a live exchange rate.
- **API client:** timeout, cancellation, normalised errors (`ApiError`), retry policy for TanStack Query (`shouldRetry`), and a product normaliser that rejects malformed payloads.
- **Fonts:** system font stack for now (no network dependency at build time).

## Demo accounts (development only)
Sign-in is simulated in the browser. Passwords are stored only as SHA-256 hashes in `src/data/demo-users.json`.
This is **not** production security.

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@shopsphere.dev | Customer@123 |
| Admin | admin@shopsphere.dev | Admin@1234 |

New accounts created on `/register` are always customers and live in your browser's localStorage.

## Catalogue behaviour
- DummyJSON cannot filter by price, rating or brand, so the app fetches the full product set for a page (cached by TanStack Query) and filters, sorts and paginates client-side with pure functions in `src/features/products/catalogue-filter.js`.
- All filter, sort, page and search state lives in the URL (`/products?category=laptops&min=5000&sort=price-asc&page=2`), so back/forward and shared links work.
- Search is debounced (350 ms) and never calls the API for empty input; queries are capped at 100 characters.

## Route protection
`RouteGuard` protects `/account` (any signed-in user) and `/admin` (admin only). It is a client-side UI guard for this frontend-only demo, not server-side security.

## Product detail, cart and wishlist (Phase 3)
- **Product page** (`/products/[id]`): gallery with lightbox, stock-limited quantity, specifications built only from fields DummyJSON returns, simulated pincode delivery estimate, read-only DummyJSON reviews (customer reviews arrive in a later phase), and a simple "more in this category" rail (replaced by the weighted Similar Products strategy in the recommendation phase).
- **Variants** are demo data: `src/data/variants.json` (sizes and colours for a few categories). An option is unavailable when `(productId + optionIndex) % 7 === 0`. This is a documented demo rule, not real inventory. Stock is shared across a product's variants.
- **Cart** (`/cart`): one line per product+variant, shared-stock clamping, Save for Later, coupons, live validation against the API. Handled cases: out of stock, quantity above stock (auto-clamped with an explanation), price changes (customer must accept the new price), product removed from the API (kept visible with a Remove action), API failure (last-known data plus Retry), duplicate adds, refresh, and two tabs (cart syncs through the `storage` event). Checkout is blocked while any line needs attention.
- **Pricing rules** (`src/lib/constants.js`): flat ₹99 shipping, free from ₹999 after discount, 18% simulated tax.
- **Demo coupons:** `WELCOME10` (10% up to ₹500), `SAVE200` (₹200 off ₹1,500+), `FREESHIP`, `SUMMER25` (expired, to demonstrate the expired message).
- **Wishlist** (`/wishlist`): current price and stock, Move to cart, unavailable items kept and flagged. Decision: the wishlist is saved in localStorage for guests and customers alike (the PRD marks it "session-limited" for guests; this simpler behaviour is documented rather than hidden).
- **Quick View and Compare:** accessible dialog (focus trap, Escape, focus restore); compare 2-4 products on `/compare`.

## Checkout and orders (Phase 4)
- **Six steps** (`/checkout`, customers only): Customer, Address, Delivery, Summary, Payment, Confirmation. Progress and entered details persist locally, so a refresh or an expired session resumes at the same step after sign-in. Details are cleared if a different customer signs in.
- **Delivery options (simulated):** Economy (free, 6-8 days), Standard (3-5 days, follows the cart shipping rule), Express (₹199, 1-2 days). The chosen cost replaces the cart's shipping estimate.
- **Payment is test mode only.** Mock card = pick a test scenario (ending 4242 approves, ending 0002 declines). Mock UPI = a `...@test` handle (`success@test` approves, `fail@test` declines; real-looking handles are rejected). Cash on delivery stays "pending" until the order is marked delivered. No card numbers, CVVs, bank logins or UPI PINs are requested, stored or sent anywhere.
- **Payment failure** shows the reason and a Retry button on the same step. Nothing is lost, the cart is only cleared after success, and double submits cannot create two orders.
- **Orders** (`/orders`, `/orders/[id]`): stored locally (`src/data/orders.json` seeds six demo orders for the demo customer, one per tracking stage). Customers see only their own orders; administrators see all. Another customer's order looks identical to a missing one. Tracking is simulated; an administrator can advance an order through the six stages from the order page (the full admin dashboard comes later).
- **Saved addresses** (`/account/addresses`): add, edit, delete, set default. Checkout can reuse them or save a new one.
- **Known limitation:** orders and addresses live in this browser's localStorage, so they are per device. That is by design for this frontend-only demo.

## Recommendation engine (Phase 5)
Rule-based and explainable. It does not use machine learning or an LLM, and says so on the preferences page.

**Architecture** (UI never contains scoring):
`RecommendationRail` -> `useRecommendations()` -> `recommendation-service` -> `recommendation-provider` -> `recommendation-engine` + `recommendation-scoring` -> DummyJSON catalogue + `src/data/recommendations.json`.
Another provider (for example a machine-learning one) can replace the mock one with `setRecommendationProvider()` and no UI changes; the contract is documented in `recommendation-provider.js`. The service never throws: a failing provider gives an empty result and the rail simply hides.

**Signals:** recently viewed (most recent first, older items count 15% less each), search history, categories, tags, brands, price range, ratings, wishlist, cart and previous purchases (weighted highest). Unknown or deleted products are ignored; out-of-stock products are never recommended; items already bought, carted or saved are not suggested back.

**Weighted score** (all components 0-1, weights centralised in `recommendation-scoring.js`):
`score = 0.22 categoryMatch + 0.16 priceSimilarity + 0.16 tagOverlap + 0.10 normalizedRating + 0.12 recentlyViewedRelation + 0.12 wishlistRelation + 0.12 cartRelation`.
Brand affinity and search-history match are blended in at 10% (`final = 0.9 * base + 0.1 * modifiers`), so the result stays between 0 and 1.

**Nine strategies:** 1 Because you viewed, 2 Similar products, 3 Popular in your category, 4 Within your price range, 5 Based on your wishlist, 6 Complete your order (cart), 7 Frequently bought together, 8 Trending, 9 Recommended for you. With fewer than 2 products of activity, "Recommended for you" falls back to popular products and says so.

**Mock data (documented, not real sales):** `recommendations.json` holds category associations for "bought together" and category momentum for trending. Per-product popularity and rating velocity are derived deterministically from the product id, so results are stable and never random.

**Where rails appear:** home page (trending, personalised, recently viewed, because-you-viewed, category, price), product page (similar, frequently bought together, personalised), cart (complete your order), wishlist (based on your wishlist).

**Local analytics:** impressions are counted once per rail when it scrolls into view (never per re-render), plus clicks and add-to-carts, per strategy, in `localStorage` key `shopsphere-rec-analytics`. The administrator dashboard will read these.

**Transparency:** `/account/preferences` shows the price range, preferred categories, and the viewed, wishlist, cart, purchase and search signals, all computed from real state, with a confirmed "Reset personalisation" (clears recently viewed and search history only).

## Shopping assistant (Phase 6)
**Rule-based, not an LLM.** No paid AI API, no API key, nothing leaves the browser. The panel says so, and the information section shows: "This shopping assistant uses rule-based intent recognition and product filtering. It does not currently use a live large language model."

**Pipeline** (`src/services/assistant/`): message -> `intent-parser.js` (structured intent) -> `conversation-service.js` (merge with remembered context) -> `assistant-service.js` (run the **shared** product filter in `features/products/catalogue-filter.js`, or the **Similar Products** strategy of the recommendation service). The assistant has no filtering code of its own.

**Understands:** categories and synonyms (phones, mobiles, laptops, earbuds, sneakers, perfume and more, see `category-lexicon.js`), price ceilings and floors (`under ₹5,000`, `below 10k`, `less than 30000`, `1.5 lakh`, `between 2000 and 5000`), minimum ratings (`good ratings`, `4 stars and up`), colours, relative refinements and similar-product requests. Example: "Show me headphones under 5000 with good ratings" becomes `{ category: "headphones", maxPrice: 5000, minRating: 4 }`.

**Follow-ups:** "Show me something cheaper" (ceiling drops below the median price of the last results), "Something with better ratings" (minimum steps 4, 4.5, 4.8, keeping category and price), "Only in blue", "Show me more like the second one" (results are numbered), "Never mind, show me headphones instead" (new category, keeps price and rating, drops colour). Naming a new category without "instead" starts a fresh search.

**Honest limits:** DummyJSON has no headphones category, so "headphones" means the mobile-accessories category narrowed by title or tag keywords. Colour filtering works only where product data has colours: the demo variant fixture (sunglasses) or a colour named in the product text. If a colour cannot be applied, the assistant says so instead of ignoring it. Messages it cannot understand get a clarification and three working example prompts, never unrelated products.

**Chat UI:** floating button, panel (full screen on phones), numbered inline product cards with add to cart, starter prompts, typing indicator, clear chat, retry on failure, Escape to close with focus returned to the launcher. The conversation is kept in `sessionStorage` for the tab session and stores product ids only.

## Administrator dashboard (Phase 7)
Sign in as `admin@shopsphere.dev`. Everything under `/admin` is administrator-only (a client-side UI guard for this frontend-only demo, not server security). Every admin screen says that changes are **saved locally in this demo**; nothing reaches a real database.

- **Overview:** totals for products, orders and customers; revenue and conversion rate (labelled *Simulated*: demo orders and a seeded visitor count); top-performing products; low-stock alerts (stock of 5 or less); recent order activity; recommendation click-through summary.
- **Products:** search, category, stock (in / low / out) and status filters; inline stock updates; add product; edit (price, discount, stock, title, description, brand); archive and restore; delete. A product that any order references **cannot be deleted** (the screen explains why and offers to archive it), so order history never breaks. Imported DummyJSON products keep their category; products you create can use any category. Product images are not part of this demo.
- **Categories:** add, rename and remove categories you created; built-in categories are read-only; a category with products cannot be removed.
- **Orders:** search by order id, name or email; status, customer and date filters; open an order; advance it one stage at a time through the six-stage lifecycle (cash on delivery is marked paid on delivery).
- **Reviews:** moderation list; remove reviews.
- **Analytics:** recommendation impressions, clicks, click-through rate, add-to-cart conversion and per-strategy performance with a chart, labelled **Local Analytics**. A switch adds or removes the demo seed data (`src/data/analytics.json`).

**How local changes reach customers:** edits are stored in `src/store/admin-products-store.js` and layered over the DummyJSON data inside the API service (`services/api/admin-overlay.js`), so catalogue, search, product pages, carts, wishlists and recommendations all see them. A price change makes customers confirm the new price in their cart; an archived or deleted product becomes "no longer available" (kept visible in carts with a Remove action). Completing a checkout reduces stock locally.

## Reviews (Phase 7)
- Star rating (1-5) plus text of 10 to 1,000 characters, validated; one review per customer per product, which the customer can edit or delete (also from **Account, Your reviews**). Only signed-in customers can post; administrators moderate.
- Sorting: most recent, highest rated, lowest rated, most helpful. Helpful / not helpful votes, one per voter, can be switched or withdrawn.
- **Verified purchase** is never stored: it is derived at display time from the viewer's local order history (plus mock purchase records for seed reviewers in `src/data/reviews.json`), so not every review is verified.
- Rating distribution chart (5 to 1 stars) is computed from all reviews shown. DummyJSON's own reviews appear read-only next to customer reviews. Review text is rendered as plain text, never HTML.
- Demo reviews in `src/data/reviews.json` were written for this project and are not from real customers.
