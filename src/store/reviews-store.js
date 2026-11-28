import { createPersistedStore } from "./create-persisted-store";
import { STORAGE_KEYS } from "@/lib/constants";
import seed from "@/data/reviews.json";

/**
 * Reviews and helpfulness votes, kept locally. Starts with documented demo reviews (data/reviews.json).
 * Votes are tracked per voter so nobody can vote twice on one review.
 *
 * @typedef {{id: string, productId: number, userId: string|null, authorName: string, rating: number, text: string,
 *   createdAt: string, updatedAt?: string, helpful: number, notHelpful: number}} Review
 */
export const initialReviewsState = () => ({ reviews: seed.reviews, votes: {} });

export const useReviewsStore = createPersistedStore(
  STORAGE_KEYS.reviews,
  (set, get) => ({
    ...initialReviewsState(),

    /** One review per customer per product. Returns the new id, or null when the customer already reviewed it. */
    addReview: ({ productId, userId, authorName, rating, text }) => {
      if (get().reviews.some((r) => r.productId === productId && r.userId === String(userId))) return null;
      const id = `r_${crypto.randomUUID()}`;
      const review = { id, productId, userId: String(userId), authorName, rating: Number(rating), text: String(text).trim(), createdAt: new Date().toISOString(), helpful: 0, notHelpful: 0 };
      set((s) => ({ reviews: [review, ...s.reviews] }));
      return id;
    },

    updateReview: (id, { rating, text }) =>
      set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, rating: Number(rating), text: String(text).trim(), updatedAt: new Date().toISOString() } : r)) })),

    removeReview: (id) =>
      set((s) => {
        const { [id]: _drop, ...votes } = s.votes;
        return { reviews: s.reviews.filter((r) => r.id !== id), votes };
      }),

    /** Vote helpful or not helpful. Voting the same way again takes the vote back; the other way switches it. */
    vote: (reviewId, voterId, value) =>
      set((s) => {
        const current = s.votes[reviewId] ?? {};
        const next = { ...current };
        if (current[voterId] === value) delete next[voterId];
        else next[voterId] = value;
        return { votes: { ...s.votes, [reviewId]: next } };
      }),
  }),
  { version: 1 },
);
