import { CATEGORY_DEFS, COLOURS } from "./category-lexicon";

/**
 * Rule-based intent recognition. Pure function: text in, structured intent out.
 * No model, no network. Recognises categories (with synonyms), price ceilings and floors in many
 * phrasings (₹, rupees, 10k, 1.5 lakh), minimum ratings, colours, relative refinements
 * (cheaper, better ratings), similar-product requests ("more like the second one"), and category switches.
 *
 * @typedef {Object} Intent
 * @property {"search"|"similar"|"greeting"|"thanks"|"help"|"reset"|"unknown"} kind
 * @property {string|null} category        a key of CATEGORY_DEFS
 * @property {number|null} maxPrice
 * @property {number|null} minPrice
 * @property {number|null} minRating
 * @property {string|null} colour
 * @property {boolean} cheaper             "something cheaper" (relative to the previous results)
 * @property {boolean} betterRated         "better ratings" (relative to the previous filter)
 * @property {boolean} instead             explicit switch: "never mind ... instead"
 * @property {number|null} reference       1-based position of a previous result, -1 for the last one
 * @property {string} raw
 */

export const MAX_INPUT_LENGTH = 300;

const CUR = String.raw`(?:₹|rs\.?|inr)?\s*`;
const NUM = String.raw`(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s*(k|thousand|lakhs?|lacs?)\b)?`;
const MAX_WORDS = String.raw`(?:under|below|less than|lower than|cheaper than|up to|upto|within|at most|no more than|not more than|maximum|max|budget(?: of)?)`;
const MIN_WORDS = String.raw`(?:above|over|more than|greater than|at least|minimum|min|starting (?:from|at))`;
const MAX_RE = new RegExp(String.raw`\b${MAX_WORDS}\s*(?:of\s*)?${CUR}${NUM}`);
const MIN_RE = new RegExp(String.raw`\b${MIN_WORDS}\s*(?:of\s*)?${CUR}${NUM}`);
const BETWEEN_RE = new RegExp(String.raw`\bbetween\s*${CUR}${NUM}\s*(?:and|to|-)\s*${CUR}${NUM}`);
const CURRENCY_FIRST_RE = new RegExp(String.raw`(?:₹|\brs\.?|\binr)\s*${NUM}`);
const CURRENCY_LAST_RE = new RegExp(String.raw`${NUM}\s*(?:rupees?|\brs\b|\binr\b)`);

const RATING_NUMERIC = [
  /\b(?:rating|rated|stars?)\s*(?:of\s*)?(?:above|over|at least|minimum|min|more than|>=|>)?\s*([1-5](?:\.\d)?)\b/,
  /\b(?:at least|minimum|min|above|over)?\s*([1-5](?:\.\d)?)\s*\+?\s*(?:stars?|star rating|ratings?)(?:\s*(?:and|&)\s*(?:up|above|more|higher))?\b/,
];
const RATING_WORDS = /\b(?:good|great|excellent|high|highly|well|best|top)[\s-]*(?:rated|ratings?|reviews?|reviewed)\b/;
const BETTER_RATED = /\b(?:better|higher|improved)[\s-]*(?:rated|ratings?|reviews?)\b/;
const CHEAPER = /\b(?:cheaper|more affordable|less expensive|lower[\s-]priced?|budget[\s-]friendly|affordable|inexpensive)\b/;
const COLOUR_RE = new RegExp(String.raw`\b(${COLOURS.join("|")})\b`);
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, last: -1 };
const REFERENCE_RE = /(?:like|similar to|same as)\s+(?:the\s+|number\s+|no\.?\s*|#)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|[1-9])\b/;
const DEICTIC_RE = /(?:like|similar to)\s+(?:this|that|it)\b/;
const INSTEAD_RE = /\b(?:never ?mind|instead|actually|rather|forget (?:that|it))\b/;
const GREETING_RE = /^(?:hi|hello|hey|hiya|namaste|good (?:morning|afternoon|evening))\b/;
const THANKS_RE = /\b(?:thanks|thank you|thx)\b/;
const HELP_RE = /\b(?:help|what can you do|what do you do|how do(?:es)? (?:this|it) work)\b/;
const RESET_RE = /\b(?:start over|reset|new search|clear (?:the |my )?(?:filters?|search|chat))\b/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toValue = (num, suffix) => {
  const n = parseFloat(String(num).replace(/,/g, ""));
  const m = !suffix ? 1 : suffix === "k" || suffix === "thousand" ? 1000 : 100000; // lakh / lac
  return Math.round(n * m);
};
const sane = (n) => (Number.isFinite(n) && n >= 1 && n <= 10_000_000 ? n : null);

/** Longest matching synonym wins ("phone accessories" beats "phone"); ties go to the earliest mention. */
function findCategory(t) {
  let best = null;
  for (const [id, def] of Object.entries(CATEGORY_DEFS)) {
    for (const syn of def.synonyms) {
      const m = new RegExp(`(^|[^\\w-])${escapeRe(syn)}(?![\\w-])`).exec(t);
      if (m && (!best || syn.length > best.len || (syn.length === best.len && m.index < best.index))) best = { id, len: syn.length, index: m.index };
    }
  }
  return best?.id ?? null;
}

/** @returns {Intent} */
export function parseIntent(input) {
  const raw = String(input ?? "").slice(0, MAX_INPUT_LENGTH);
  let t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  /** @type {Intent} */
  const intent = { kind: "unknown", category: null, maxPrice: null, minPrice: null, minRating: null, colour: null, cheaper: false, betterRated: false, instead: false, reference: null, raw };
  if (!t) return intent;

  const strip = (re) => {
    const m = re.exec(t);
    if (m) t = t.replace(re, " ");
    return m;
  };

  // Similar-product reference ("more like the second one").
  const ref = REFERENCE_RE.exec(t);
  if (ref) intent.reference = ORDINALS[ref[1]] ?? parseInt(ref[1], 10);
  else if (DEICTIC_RE.test(t)) intent.reference = 1;

  // Ratings first, so "4 stars" is never mistaken for a price.
  if (strip(BETTER_RATED)) intent.betterRated = true;
  for (const re of RATING_NUMERIC) {
    const m = strip(re);
    if (m) {
      intent.minRating = Math.min(5, parseFloat(m[1]));
      break;
    }
  }
  if (intent.minRating === null && strip(RATING_WORDS)) intent.minRating = 4;

  // Prices.
  let m;
  if ((m = BETWEEN_RE.exec(t))) {
    const a = sane(toValue(m[1], m[2]));
    const b = sane(toValue(m[3], m[4]));
    if (a !== null && b !== null) [intent.minPrice, intent.maxPrice] = a <= b ? [a, b] : [b, a];
  } else {
    if ((m = MAX_RE.exec(t))) intent.maxPrice = sane(toValue(m[1], m[2]));
    if ((m = MIN_RE.exec(t))) intent.minPrice = sane(toValue(m[1], m[2]));
    if (intent.maxPrice === null && intent.minPrice === null && ((m = CURRENCY_FIRST_RE.exec(t)) || (m = CURRENCY_LAST_RE.exec(t)))) {
      intent.maxPrice = sane(toValue(m[1], m[2])); // a bare "₹5,000" is read as a budget
    }
  }

  const colour = COLOUR_RE.exec(t);
  if (colour) intent.colour = colour[1] === "gray" ? "grey" : colour[1];
  intent.cheaper = CHEAPER.test(t) && intent.maxPrice === null; // an explicit ceiling beats "cheaper"
  intent.category = findCategory(t);
  intent.instead = INSTEAD_RE.test(t);

  const signals = intent.category || intent.maxPrice !== null || intent.minPrice !== null || intent.minRating !== null || intent.colour || intent.cheaper || intent.betterRated;
  if (intent.reference !== null) intent.kind = "similar";
  else if (signals) intent.kind = "search";
  else if (RESET_RE.test(t)) intent.kind = "reset";
  else if (HELP_RE.test(t)) intent.kind = "help";
  else if (THANKS_RE.test(t)) intent.kind = "thanks";
  else if (GREETING_RE.test(t)) intent.kind = "greeting";
  return intent;
}
