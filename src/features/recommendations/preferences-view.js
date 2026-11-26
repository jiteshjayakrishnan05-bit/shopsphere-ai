"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { formatCategory, formatPrice } from "@/lib/formatters";
import { usePersonalizationInputs } from "@/hooks/use-recommendations";
import { useRecentlyViewedStore, useSearchHistoryStore } from "@/store";
import { MIN_PERSONALIZATION_SIGNALS } from "@/services/recommendation/recommendation-scoring";
import { buildProfile, roundTo } from "@/services/recommendation/recommendation-signals";
import { Skeleton } from "@/components/feedback/skeleton";
import { ErrorState } from "@/components/feedback/error-state";

/** "A", "A and B", "A, B and C" */
export const joinNames = (names) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
const titles = (anchors, n = 3) => anchors.slice(0, n).map((a) => a.product.title);

function Card({ title, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-ink-soft">{children}</div>
    </section>
  );
}

/** Transparency page: every line below is computed from the customer's actual activity, never hardcoded. */
export function PreferencesView() {
  const { hydrated, catalogue, catalogueFailed, signals } = usePersonalizationInputs();
  const clearViewed = useRecentlyViewedStore((s) => s.clear);
  const clearSearches = useSearchHistoryStore((s) => s.clear);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const profile = useMemo(() => (catalogue ? buildProfile({ catalogue, ...signals }) : null), [catalogue, signals]);

  if (catalogueFailed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState title="Couldn't load your preferences" message="We need the product catalogue to explain your recommendations. Check your connection and reload." />
      </div>
    );
  }
  if (!hydrated || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  const active = profile.signalCount >= MIN_PERSONALIZATION_SIGNALS;
  const topCategories = Object.entries(profile.categoryShare).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topBrands = Object.entries(profile.brandShare).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const { viewed, wishlist, cart, purchased } = profile.anchors;

  function reset() {
    clearViewed();
    clearSearches();
    setConfirming(false);
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/account" className="text-sm text-brand-600 underline">
        ← Your account
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Recommendation preferences</h1>
      <p className="mt-1 text-sm text-ink-soft">
        These are the signals behind your recommendations. They come from this browser only. Recommendations use rule-based scoring, not a live AI model.
      </p>

      <div className="mt-6 space-y-4">
        <Card title="Personalisation status">
          {active ? (
            <p>Active. We have {profile.signalCount} products of activity to learn from.</p>
          ) : (
            <p>
              Not active yet. We need activity on at least {MIN_PERSONALIZATION_SIGNALS} products (browsing, saving, carting or buying). Until then you see popular products.
            </p>
          )}
        </Card>

        <Card title="Typical price range">
          {profile.priceRange ? (
            <p>
              Your typical shopping range is{" "}
              <strong className="text-ink">
                {formatPrice(roundTo(profile.priceRange.low))}–{formatPrice(roundTo(profile.priceRange.high))}
              </strong>
              .
            </p>
          ) : (
            <p>No price pattern yet.</p>
          )}
        </Card>

        <Card title="Preferred categories">
          {topCategories.length === 0 ? (
            <p>None yet. Browse a few products to teach us what you like.</p>
          ) : (
            <ul className="space-y-2" aria-label="Preferred categories">
              {topCategories.map(([slug, share]) => (
                <li key={slug}>
                  <div className="flex justify-between text-ink">
                    <span>{formatCategory(slug)}</span>
                    <span>{Math.round(share * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-muted" aria-hidden="true">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.round(share * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {topBrands.length > 0 && <p className="mt-3">Brands you favour: {joinNames(topBrands.map(([b]) => b))}.</p>}
        </Card>

        <Card title="What is shaping your suggestions">
          <ul className="list-disc space-y-1 pl-5">
            <li>{viewed.length ? `Because you recently viewed ${joinNames(titles(viewed))}.` : "No recently viewed products yet."}</li>
            <li>{wishlist.length ? `Your wishlist (${wishlist.length} ${wishlist.length === 1 ? "item" : "items"}, including ${joinNames(titles(wishlist, 2))}) influences complementary picks.` : "Your wishlist is empty."}</li>
            <li>{cart.length ? `Your cart (${cart.length} ${cart.length === 1 ? "item" : "items"}, including ${joinNames(titles(cart, 2))}) influences "complete your order" picks.` : "Your cart is empty."}</li>
            <li>{purchased.length ? `Your previous orders (${purchased.length} ${purchased.length === 1 ? "product" : "products"}) count the most, and those products are not suggested again.` : "No previous purchases yet."}</li>
            <li>{profile.searchTerms.length ? `You searched for ${joinNames(profile.searchTerms.map((t) => `“${t}”`))}.` : "No searches yet."}</li>
          </ul>
        </Card>

        <Card title="Reset personalisation">
          <p>Clears your recently viewed items and search history. Your wishlist, cart and orders are not touched, so they keep influencing suggestions.</p>
          {confirming ? (
            <div role="alertdialog" aria-label="Confirm reset" className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-muted p-3">
              <span className="text-ink">Reset your browsing signals?</span>
              <button type="button" onClick={reset} className="rounded-md bg-danger px-4 py-1.5 text-sm font-medium text-white">
                Yes, reset
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-line px-4 py-1.5 text-sm font-medium">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setConfirming(true); setDone(false); }} className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset personalisation
            </button>
          )}
          <p role="status" className="mt-2 text-success">
            {done ? "Personalisation reset. Your browsing signals were cleared." : ""}
          </p>
        </Card>
      </div>
    </div>
  );
}
