"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import seed from "@/data/reviews.json";
import { useAuth } from "@/hooks/use-auth";
import { useReviewsStore } from "@/store";
import { formatDay } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ReviewForm } from "./review-form";
import { REVIEW_SORTS, isVerifiedPurchase, ratingDistribution, sortReviews, voteCounts } from "./review-logic";
import { useProductReviews } from "./use-product-reviews";

const INITIAL_VISIBLE = 5;

export function Stars({ value, className = "h-4 w-4" }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(className, n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-line")} />
      ))}
    </span>
  );
}

/** Rating distribution: one bar per star level. */
function Distribution({ dist }) {
  return (
    <ul aria-label="Rating distribution" className="w-full max-w-xs space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = dist.counts[star];
        const pct = dist.total ? Math.round((count / dist.total) * 100) : 0;
        return (
          <li key={star} className="flex items-center gap-2 text-xs">
            <span className="w-12 shrink-0">{star} stars</span>
            <span className="h-2 flex-1 rounded-full bg-surface-muted" aria-hidden="true">
              <span className="block h-2 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right text-ink-soft">
              {count}
              <span className="sr-only"> {count === 1 ? "review" : "reviews"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductReviews({ product }) {
  const { user, isAdmin } = useAuth();
  const { all, local, votes, orders } = useProductReviews(product);
  const { addReview, updateReview, removeReview, vote } = useReviewsStore.getState();
  const [sort, setSort] = useState("recent");
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [notice, setNotice] = useState("");

  const dist = useMemo(() => ratingDistribution(all), [all]);
  const sorted = useMemo(() => sortReviews(all, sort, votes), [all, sort, votes]);
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const mine = user ? local.find((r) => r.userId === String(user.id)) : null;
  const voter = user ? String(user.id) : "guest";
  const isCustomer = user?.role === "customer";

  function post({ rating, text }) {
    const id = addReview({ productId: product.id, userId: user.id, authorName: user.name, rating, text });
    setNotice(id ? "Thanks! Your review was posted. It is saved in this browser." : "You have already reviewed this product.");
  }
  function save({ rating, text }) {
    updateReview(mine.id, { rating, text });
    setEditing(false);
    setNotice("Your review was updated.");
  }

  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-lg font-semibold">
        Customer reviews
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-6">
        {all.length > 0 ? (
          <>
            <div>
              <p className="text-3xl font-semibold">
                {dist.average.toFixed(1)}
                <span className="sr-only"> out of 5</span>
              </p>
              <Stars value={dist.average} />
              <p className="mt-1 text-xs text-ink-soft">
                {dist.total} {dist.total === 1 ? "review" : "reviews"}
              </p>
            </div>
            <Distribution dist={dist} />
          </>
        ) : (
          <p className="text-sm text-ink-soft">No reviews yet. Be the first to review this product.</p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-4">
        {isCustomer ? (
          mine && !editing ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>You have reviewed this product.</span>
              <button type="button" onClick={() => { setEditing(true); setNotice(""); }} className="font-medium text-brand-600 underline">
                Edit your review
              </button>
            </div>
          ) : mine && editing ? (
            <>
              <h3 className="mb-3 text-sm font-semibold">Edit your review</h3>
              <ReviewForm initial={{ rating: mine.rating, text: mine.text }} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} />
            </>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-semibold">Write a review</h3>
              <ReviewForm onSubmit={post} />
            </>
          )
        ) : isAdmin ? (
          <p className="text-sm text-ink-soft">Administrators moderate reviews and cannot post them.</p>
        ) : (
          <p className="text-sm">
            <Link href={`/login?next=${encodeURIComponent(`/products/${product.id}`)}`} className="font-medium text-brand-600 underline">
              Sign in
            </Link>{" "}
            to write a review.
          </p>
        )}
        <p role="status" className="mt-2 min-h-5 text-xs text-success">
          {notice}
        </p>
      </div>

      {all.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              Showing {visible.length} of {sorted.length}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">Sort reviews</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1.5">
                {REVIEW_SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul aria-label="Reviews" className="mt-3 space-y-3">
            {visible.map((r) => {
              const counts = voteCounts(r, votes);
              const myVote = votes[r.id]?.[voter];
              const own = user && r.userId === String(user.id);
              const removable = r.source !== "catalogue" && (own || isAdmin);
              const verified = isVerifiedPurchase(r, orders, seed.purchaseRecords);
              return (
                <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} />
                    <span className="sr-only">{r.rating} out of 5 stars</span>
                    <span className="text-sm font-medium">{r.authorName}</span>
                    {own && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">Your review</span>}
                    {verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
                      </span>
                    )}
                    <span className="text-xs text-ink-soft">
                      {formatDay(r.createdAt)}
                      {r.updatedAt && " (edited)"}
                    </span>
                  </div>
                  {/* Plain text only: React escapes it, so review content can never inject markup. */}
                  <p className="mt-2 whitespace-pre-line text-sm">{r.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <button type="button" aria-pressed={myVote === "up"} onClick={() => vote(r.id, voter, "up")} aria-label={`Helpful, ${counts.helpful}`} className={cn("inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-surface-muted", myVote === "up" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line")}>
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Helpful ({counts.helpful})
                    </button>
                    <button type="button" aria-pressed={myVote === "down"} onClick={() => vote(r.id, voter, "down")} aria-label={`Not helpful, ${counts.notHelpful}`} className={cn("inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-surface-muted", myVote === "down" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line")}>
                      <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" /> Not helpful ({counts.notHelpful})
                    </button>
                    {removable &&
                      (confirmId === r.id ? (
                        <span className="inline-flex items-center gap-2" role="alertdialog" aria-label="Confirm removal">
                          Remove this review?
                          <button type="button" onClick={() => { removeReview(r.id); setConfirmId(null); setNotice("Review removed."); }} className="font-medium text-danger underline">
                            Yes, remove
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className="underline">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmId(r.id)} aria-label={isAdmin && !own ? `Remove review by ${r.authorName} (moderation)` : "Delete your review"} className="text-danger hover:underline">
                          {isAdmin && !own ? "Remove (moderate)" : "Delete"}
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
          {sorted.length > INITIAL_VISIBLE && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-brand-600 underline">
              {showAll ? "Show fewer reviews" : `Show all ${sorted.length} reviews`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
