import { Star } from "lucide-react";

const stars = (n) => Array.from({ length: 5 }, (_, i) => (
  <Star key={i} className={`h-4 w-4 ${i < Math.round(n) ? "fill-amber-400 text-amber-400" : "text-line"}`} aria-hidden="true" />
));

/**
 * Read-only reviews that DummyJSON ships with each product. Customer-written reviews, voting and
 * verified-purchase badges are built in the reviews phase. Text is rendered as plain text (escaped by React).
 */
export function ProductReviewsPreview({ reviews = [], rating }) {
  const list = Array.isArray(reviews) ? reviews : [];
  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-lg font-semibold">
        Customer reviews
      </h2>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p>
      ) : (
        <>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
            <span className="flex">{stars(rating)}</span>
            {rating.toFixed(1)} average from {list.length} {list.length === 1 ? "review" : "reviews"}
          </p>
          <ul className="mt-4 space-y-4">
            {list.map((r, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="flex">{stars(r.rating)}</span>
                  <span className="sr-only">{r.rating} out of 5</span>
                  <span className="text-sm font-medium">{String(r.reviewerName ?? "Customer")}</span>
                </div>
                <p className="mt-2 text-sm">{String(r.comment ?? "")}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
