import { formatPrice } from "@/lib/formatters";
import { filterProducts, sortProducts } from "@/features/products/catalogue-filter";
import { serializeCatalogueParams } from "@/features/products/catalogue-params";
import { getRecommendations } from "@/services/recommendation/recommendation-service";
import { STRATEGY } from "@/services/recommendation/recommendation-strategies";
import { CATEGORY_DEFS, STARTER_PROMPTS } from "./category-lexicon";
import { buildQuery, emptyContext, median } from "./conversation-service";
import { parseIntent } from "./intent-parser";

/** Shown in the assistant's information section (PRD §7.5). */
export const ASSISTANT_DISCLAIMER =
  "This shopping assistant uses rule-based intent recognition and product filtering. It does not currently use a live large language model.";

export const RESULTS_SHOWN = 4;
const NO_SIGNALS = { viewedIds: [], wishlistIds: [], cartProductIds: [], purchasedProductIds: [], searchTerms: [] };

/** @typedef {{text: string, productIds: number[], link: {href: string, label: string}|null, suggestions: string[], chips: string[], error?: boolean}} AssistantMessage */

const message = (text, extra = {}) => ({ text, productIds: [], link: null, suggestions: [], chips: [], ...extra });
const fallbackSuggestions = () => STARTER_PROMPTS.slice(0, 3);
const describe = (q) => {
  const parts = [];
  if (q.minPrice !== null && q.maxPrice !== null) parts.push(`between ${formatPrice(q.minPrice)} and ${formatPrice(q.maxPrice)}`);
  else if (q.maxPrice !== null) parts.push(`under ${formatPrice(q.maxPrice)}`);
  else if (q.minPrice !== null) parts.push(`from ${formatPrice(q.minPrice)}`);
  if (q.minRating !== null) parts.push(`rated ${q.minRating}★ or more`);
  if (q.colour) parts.push(`in ${q.colour}`);
  return parts.length ? ` ${parts.join(", ")}` : "";
};
const chipsFor = (q, label) => [
  label,
  ...(q.minPrice !== null && q.maxPrice !== null ? [`${formatPrice(q.minPrice)}–${formatPrice(q.maxPrice)}`] : q.maxPrice !== null ? [`under ${formatPrice(q.maxPrice)}`] : q.minPrice !== null ? [`from ${formatPrice(q.minPrice)}`] : []),
  ...(q.minRating !== null ? [`${q.minRating}★ & up`] : []),
  ...(q.colour ? [q.colour] : []),
];

function viewAllLink(q, def, total) {
  const base = { q: "", categories: [], brands: [], minPrice: q.minPrice, maxPrice: q.maxPrice, minRating: q.minRating, stock: "all", onSale: false, sort: "relevance", page: 1 };
  const href = def.keywords?.length ? `/search${serializeCatalogueParams({ ...base, q: def.keywords[0] })}` : `/products${serializeCatalogueParams({ ...base, categories: def.slugs })}`;
  return { href, label: `See all ${total} results` };
}

/** Products in a category definition, using the shared catalogue filter (no assistant-specific filtering). */
const inCategory = (catalogue, def, extra = {}) => filterProducts(catalogue, { categories: def.slugs, keywords: def.keywords, stock: "in", ...extra });

async function respondSimilar(intent, context, catalogue) {
  const ids = context.resultIds;
  if (!ids.length) return { message: message("I don't have any results to compare yet. Ask me for a product first, for example:", { suggestions: fallbackSuggestions() }), context };
  const index = intent.reference === -1 ? ids.length - 1 : intent.reference - 1;
  if (index < 0 || index >= ids.length) {
    return { message: message(`I only showed ${ids.length} ${ids.length === 1 ? "product" : "products"}. Pick a number from 1 to ${ids.length}, for example “more like the first one”.`), context };
  }
  const seed = catalogue.find((p) => p.id === ids[index]);
  if (!seed) return { message: message("That product isn't available any more. Ask me to search again.", { suggestions: fallbackSuggestions() }), context };

  // Reuses the recommendation engine's Similar Products strategy.
  const recs = await getRecommendations({ strategy: STRATEGY.similar, catalogue, signals: NO_SIGNALS, seed, limit: RESULTS_SHOWN });
  if (recs.error) throw new Error("recommendation failure");
  if (!recs.items.length) return { message: message(`I couldn't find anything similar to ${seed.title}.`, { suggestions: fallbackSuggestions() }), context };
  const productIds = recs.items.map((i) => i.product.id);
  return { message: message(`Here are products similar to ${seed.title}.`, { productIds, chips: [`like #${index + 1}`] }), context: { ...context, resultIds: productIds, pending: false } };
}

function respondSearch(intent, context, catalogue) {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const previous = context.resultIds.map((id) => byId.get(id)).filter(Boolean);
  const categoryKey = intent.category ?? context.category;
  const categoryDef = categoryKey ? CATEGORY_DEFS[categoryKey] : null;
  const referencePrices = previous.length ? previous.map((p) => p.price) : categoryDef ? inCategory(catalogue, categoryDef).map((p) => p.price) : [];
  const q = buildQuery(intent, context, referencePrices);

  if (!q.category) {
    // A refinement with nothing to refine: remember the constraint and ask what to apply it to.
    return {
      message: message("Happy to help. What kind of product are you looking for?", { suggestions: fallbackSuggestions(), chips: chipsFor(q, "any product").slice(1) }),
      context: { ...emptyContext(), maxPrice: q.maxPrice, minPrice: q.minPrice, minRating: q.minRating, colour: q.colour, pending: true },
    };
  }

  const def = CATEGORY_DEFS[q.category];
  const filters = { minPrice: q.minPrice, maxPrice: q.maxPrice, minRating: q.minRating };
  let matches = inCategory(catalogue, def, { ...filters, colour: q.colour });

  // Colour is only filterable where the product data has it. Say so instead of silently ignoring it.
  if (q.colour && matches.length === 0) {
    const without = inCategory(catalogue, def, filters);
    if (without.length) {
      return {
        message: message(`I couldn't find ${def.label} in ${q.colour}. I can only filter by colour where the product data lists colours (for example sunglasses), so I've left the colour out. Want to see all ${without.length} ${def.label}${describe({ ...q, colour: null })}?`, {
          suggestions: [`Show me ${def.label}${describe({ ...q, colour: null })}`, ...fallbackSuggestions().slice(0, 1)],
          chips: chipsFor({ ...q, colour: null }, def.label),
        }),
        context,
      };
    }
  }

  if (matches.length === 0) {
    const cheapest = inCategory(catalogue, def).sort((a, b) => a.price - b.price)[0];
    const hint = q.maxPrice !== null && cheapest ? ` The cheapest ${def.label} I have is ${formatPrice(cheapest.price)}.` : " Try loosening a filter.";
    return {
      message: message(`I couldn't find any ${def.label}${describe(q)}.${hint}`, { suggestions: [`Show me ${def.label}`, ...fallbackSuggestions().slice(0, 1)], chips: chipsFor(q, def.label) }),
      context: { ...q, resultIds: [], pending: false },
    };
  }

  const ranked = sortProducts(matches, "rating");
  const shown = ranked.slice(0, RESULTS_SHOWN);
  const total = ranked.length;
  const text =
    total > shown.length
      ? `I found ${total} ${def.label}${describe(q)}. Here are the top ${shown.length}, best rated first.`
      : `I found ${total} ${def.label}${describe(q)}, best rated first.`;
  return {
    message: message(text, {
      productIds: shown.map((p) => p.id),
      link: total > shown.length ? viewAllLink(q, def, total) : null,
      chips: chipsFor(q, def.label),
      suggestions: ["Show me something cheaper", "Something with better ratings", "Show me more like the first one"],
    }),
    context: { ...q, resultIds: shown.map((p) => p.id), pending: false },
  };
}

/**
 * Turn one shopper message into a reply. Order of work: parse the message into a structured intent,
 * merge it with the remembered context, then run the shared product filter (or the Similar Products strategy).
 *
 * @param {{text: string, context: ReturnType<typeof emptyContext>, catalogue: object[]}} args
 * @returns {Promise<{message: AssistantMessage, context: ReturnType<typeof emptyContext>}>}
 */
export async function respondToMessage({ text, context = emptyContext(), catalogue }) {
  const intent = parseIntent(text);
  switch (intent.kind) {
    case "greeting":
      return { message: message("Hello! I can find products by category, budget and rating, and refine the results as we talk. Try one of these:", { suggestions: fallbackSuggestions() }), context };
    case "thanks":
      return { message: message("You're welcome! Tell me if you'd like to refine these results or look for something else.", { suggestions: ["Show me something cheaper", "Something with better ratings"] }), context };
    case "help":
      return {
        message: message("I can search by category (phones, laptops, headphones, sunglasses and more), a budget (“under 5000”, “below 10k”), a minimum rating (“good ratings”), and a colour where products list one. After results, try “something cheaper”, “better ratings”, “only in blue” or “more like the second one”.", { suggestions: fallbackSuggestions() }),
        context,
      };
    case "reset":
      return { message: message("Okay, I've cleared our search. What would you like to look for?", { suggestions: fallbackSuggestions() }), context: emptyContext() };
    case "similar":
      return respondSimilar(intent, context, catalogue);
    case "search":
      return respondSearch(intent, context, catalogue);
    default:
      // Never guess: no unrelated products, just a clarification and a few prompts that work.
      return { message: message("I'm not sure I understood that. I can find products by category, budget and rating. For example:", { suggestions: fallbackSuggestions() }), context };
  }
}
