# ShopSphere AI — Personalized Shopping, Powered by Intelligence

Frontend internship project: a production-style e-commerce storefront built with Next.js (App Router), React, Tailwind CSS,
TanStack Query and Zustand. Data comes from the free DummyJSON API plus documented local fixtures. No backend, no paid services.

> Status: **Phase 1 (foundation) complete.** Later phases add auth, discovery, commerce, recommendations, assistant, admin.

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
