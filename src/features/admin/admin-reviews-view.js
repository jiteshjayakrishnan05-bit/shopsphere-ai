"use client";

import { useState } from "react";
import Link from "next/link";
import { useReviewsStore } from "@/store";
import { formatDay } from "@/lib/formatters";
import { Stars } from "@/features/reviews/product-reviews";
import { PageHeader, btnGhost } from "./admin-ui";

/** Moderation list: every customer review, newest first, with removal. */
export function AdminReviewsView() {
  const reviews = useReviewsStore((s) => s.reviews);
  const removeReview = useReviewsStore((s) => s.removeReview);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");
  const sorted = [...reviews].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div className="space-y-4">
      <PageHeader title="Review moderation" subtitle="Remove reviews that break your guidelines. Removals are saved locally in this demo." />
      <p role="status" className="min-h-5 text-sm text-success">
        {notice}
      </p>
      {sorted.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center text-sm text-ink-soft">There are no customer reviews to moderate.</p>
      ) : (
        <ul aria-label="All reviews" className="space-y-3">
          {sorted.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                <span className="sr-only">{r.rating} out of 5 stars</span>
                <strong>{r.authorName}</strong>
                <Link href={`/products/${r.productId}`} className="text-brand-600 underline">
                  Product {r.productId}
                </Link>
                <span className="text-xs text-ink-soft">{formatDay(r.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line">{r.text}</p>
              <div className="mt-3">
                {confirm === r.id ? (
                  <span className="inline-flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm removal">
                    Remove this review?
                    <button type="button" onClick={() => { removeReview(r.id); setConfirm(null); setNotice("Review removed. Changes saved locally in this demo."); }} className="font-medium text-danger underline">
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className={btnGhost}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(r.id)} aria-label={`Remove review by ${r.authorName} on product ${r.productId}`} className="text-danger hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
