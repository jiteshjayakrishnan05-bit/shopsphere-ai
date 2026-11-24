# ShopSphere AI — Personalized Shopping, Powered by Intelligence

Frontend internship project: a production-style e-commerce storefront built with Next.js (App Router), React, Tailwind CSS,
TanStack Query and Zustand. Data comes from the free DummyJSON API plus documented local fixtures. No backend, no paid services.

> Status: **Phases 1-3 complete** (foundation, auth, discovery, product detail, cart, wishlist, Quick View, Compare). Later phases add the six-step checkout and orders, recommendations, assistant, admin and reviews.

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
- **Checkout route** (`/checkout`) requires a customer sign-in and currently shows a short holding message. The six-step checkout is the next phase.
