"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProductsByIds } from "@/hooks/use-products";
import { useReviewsStore } from "@/store";
import { formatDay } from "@/lib/formatters";
import { ReviewForm } from "./review-form";
import { Stars } from "./product-reviews";

/** The signed-in customer's own reviews, with edit and remove. */
export function MyReviewsView() {
  const { user } = useAuth();
  const reviews = useReviewsStore((s) => s.reviews);
  const { updateReview, removeReview } = useReviewsStore.getState();
  const mine = reviews.filter((r) => user && r.userId === String(user.id)).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const results = useProductsByIds(mine.map((r) => r.productId));
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");
  if (!user) return null; // the route guard normally prevents this

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/account" className="text-sm text-brand-600 underline">
        ← Your account
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your reviews</h1>
      <p role="status" className="mt-1 min-h-5 text-sm text-success">
        {notice}
      </p>

      {mine.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-10 text-center">
          <MessageSquareText className="mx-auto h-10 w-10 text-ink-soft" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No reviews yet</h2>
          <p className="mt-1 text-sm text-ink-soft">Reviews you write on product pages appear here, where you can edit or remove them.</p>
          <Link href="/orders" className="mt-4 inline-block text-sm font-medium text-brand-600 underline">
            See your orders
          </Link>
        </div>
      ) : (
        <ul aria-label="Your reviews" className="mt-4 space-y-4">
          {mine.map((r, i) => {
            const product = results[i]?.data;
            return (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <Link href={`/products/${r.productId}`} className="font-medium hover:underline">
                  {product ? product.title : `Product ${r.productId}`}
                </Link>
                {editing === r.id ? (
                  <div className="mt-3">
                    <ReviewForm
                      initial={{ rating: r.rating, text: r.text }}
                      submitLabel="Save changes"
                      onCancel={() => setEditing(null)}
                      onSubmit={(v) => {
                        updateReview(r.id, v);
                        setEditing(null);
                        setNotice("Your review was updated.");
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
                      <Stars value={r.rating} />
                      <span className="sr-only">{r.rating} out of 5 stars</span>
                      {formatDay(r.updatedAt ?? r.createdAt)}
                      {r.updatedAt && " (edited)"}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm">{r.text}</p>
                    <div className="mt-3 flex gap-4 text-sm">
                      <button type="button" onClick={() => { setEditing(r.id); setNotice(""); }} aria-label={`Edit your review of ${product?.title ?? `product ${r.productId}`}`} className="text-brand-600 hover:underline">
                        Edit
                      </button>
                      {confirm === r.id ? (
                        <span className="inline-flex items-center gap-2" role="alertdialog" aria-label="Confirm removal">
                          Remove this review?
                          <button type="button" onClick={() => { removeReview(r.id); setConfirm(null); setNotice("Review removed."); }} className="font-medium text-danger underline">
                            Yes, remove
                          </button>
                          <button type="button" onClick={() => setConfirm(null)} className="underline">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirm(r.id)} aria-label={`Remove your review of ${product?.title ?? `product ${r.productId}`}`} className="text-danger hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
