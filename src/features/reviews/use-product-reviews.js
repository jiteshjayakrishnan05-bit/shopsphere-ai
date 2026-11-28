"use client";

import { useMemo } from "react";
import { useOrdersStore, useReviewsStore } from "@/store";
import { apiReviewsFor } from "./review-logic";

/** Customer reviews for a product plus the read-only reviews that come with the DummyJSON data. */
export function useProductReviews(product) {
  const reviews = useReviewsStore((s) => s.reviews);
  const votes = useReviewsStore((s) => s.votes);
  const orders = useOrdersStore((s) => s.orders);
  const local = useMemo(() => reviews.filter((r) => r.productId === product.id), [reviews, product.id]);
  const catalogue = useMemo(() => apiReviewsFor(product), [product]);
  const all = useMemo(() => [...local, ...catalogue], [local, catalogue]);
  return { all, local, votes, orders };
}
