import { buildProfile } from "./recommendation-signals";
import { runStrategy } from "./recommendation-engine";

/**
 * Provider contract. A future machine-learning or LLM provider can replace the mock one without any UI change:
 * it only has to implement `getRecommendations(request)` and resolve to a RecommendationResult.
 *
 * @typedef {Object} RecommendationRequest
 * @property {string} strategy one of STRATEGY
 * @property {object[]} catalogue normalised products available to recommend from
 * @property {{viewedIds: number[], wishlistIds: number[], cartProductIds: number[], purchasedProductIds: number[], searchTerms: string[]}} signals
 * @property {object|null} [seed] product being viewed (similar, frequently bought together)
 * @property {string|null} [category] browsing context (category, trending)
 * @property {number} [limit]
 *
 * @typedef {Object} RecommendationProvider
 * @property {string} name
 * @property {(request: RecommendationRequest) => Promise<import("./recommendation-engine").RecommendationResult>} getRecommendations
 */

/** The rule-based provider used in this demo. It does not use a machine-learning model or an LLM. */
export const mockRecommendationProvider = {
  name: "mock-rule-based",
  async getRecommendations(request) {
    const profile = buildProfile({ catalogue: request.catalogue, ...request.signals });
    return runStrategy(request.strategy, { catalogue: request.catalogue, profile, seed: request.seed ?? null, category: request.category ?? null, limit: request.limit ?? 8 });
  },
};

let active = mockRecommendationProvider;
export const getRecommendationProvider = () => active;
export function setRecommendationProvider(provider) {
  if (!provider || typeof provider.getRecommendations !== "function") throw new Error("A recommendation provider must implement getRecommendations(request).");
  active = provider;
}
export const resetRecommendationProvider = () => {
  active = mockRecommendationProvider;
};
