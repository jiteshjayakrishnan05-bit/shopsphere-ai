"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { validateReview } from "@/lib/validators";
import { cn } from "@/lib/utils";

const MIN = 10;
const MAX = 1000;

/**
 * Star rating plus written review, validated before saving.
 * @param {{initial?: {rating?: number, text?: string}, submitLabel?: string, onSubmit: (v: {rating: number, text: string}) => void, onCancel?: () => void}} props
 */
export function ReviewForm({ initial = {}, submitLabel = "Submit review", onSubmit, onCancel }) {
  const id = useId();
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [text, setText] = useState(initial.text ?? "");
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const errs = validateReview({ rating, text });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit({ rating, text: text.trim() });
  }
  const length = text.trim().length;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Your rating</legend>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-describedby={errors.rating ? `${id}-rating-error` : undefined}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600">
              <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star className={cn("h-7 w-7", n <= rating ? "fill-amber-400 text-amber-400" : "text-line")} aria-hidden="true" />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p id={`${id}-rating-error`} className="mt-1 text-xs text-danger">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${id}-text`} className="block text-sm font-medium">
          Your review
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          rows={4}
          aria-invalid={errors.text ? "true" : undefined}
          aria-describedby={`${id}-count${errors.text ? ` ${id}-text-error` : ""}`}
          className={cn("mt-1 block w-full rounded-md border bg-surface px-3 py-2 text-sm", errors.text ? "border-danger" : "border-line")}
        />
        <p id={`${id}-count`} className="mt-1 text-xs text-ink-soft">
          {length}/{MAX} characters (at least {MIN})
        </p>
        {errors.text && (
          <p id={`${id}-text-error`} className="text-xs text-danger">
            {errors.text}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-line px-5 py-2 text-sm font-medium hover:bg-surface-muted">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
