import { generateJson, generateJsonFromImage } from "./gemini";
import { hashString, pick, seededRandom } from "./hash";
import type {
  ClothingCategory,
  ClothingItem,
  DayWeather,
  DetectedClothingItem,
  OutfitSuggestion,
  UserPreferences,
} from "./types";

// ---------------------------------------------------------------------------
// Shared mock vocabulary (used whenever GEMINI_API_KEY isn't set, or a real
// call fails — keeps the app fully usable with zero API keys configured)
// ---------------------------------------------------------------------------

const CATEGORY_SUBCATEGORIES: Record<ClothingCategory, string[]> = {
  top: ["t-shirt", "blouse", "sweater", "button-down shirt", "tank top", "hoodie"],
  bottom: ["jeans", "chinos", "shorts", "skirt", "leggings", "trousers"],
  outerwear: ["denim jacket", "blazer", "raincoat", "parka", "cardigan", "bomber jacket"],
  shoes: ["sneakers", "boots", "loafers", "sandals", "heels", "flats"],
  accessory: ["scarf", "belt", "hat", "sunglasses", "watch", "tote bag"],
  dress: ["sundress", "cocktail dress", "maxi dress", "wrap dress"],
};

const COLORS = [
  "black", "white", "navy", "gray", "beige", "olive", "burgundy",
  "denim blue", "cream", "charcoal", "forest green", "camel",
];

const PATTERNS = ["solid", "striped", "plaid", "floral", "polka dot", "checked", "graphic print"];

const STYLE_TAGS = [
  "casual", "formal", "business", "athletic", "bohemian",
  "streetwear", "preppy", "minimalist", "edgy", "classic",
];

const BASE_WARMTH: Record<ClothingCategory, number> = {
  top: 2, bottom: 2, outerwear: 4, shoes: 2, accessory: 2, dress: 2,
};

const BASE_FORMALITY: Record<ClothingCategory, number> = {
  top: 2, bottom: 2, outerwear: 3, shoes: 2, accessory: 2, dress: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Clothing detection (used right after a wardrobe photo is uploaded) — finds
// every distinct item in a photo with a bounding box so the user can review
// each one before it's saved.
// ---------------------------------------------------------------------------

function mockDetectOne(seedKey: string, box: DetectedClothingItem["box"]): DetectedClothingItem {
  const seed = hashString(seedKey);
  const categories = Object.keys(CATEGORY_SUBCATEGORIES) as ClothingCategory[];
  const category = pick(categories, seed);
  const subcategory = pick(CATEGORY_SUBCATEGORIES[category], seed * 3 + 1);
  const color = pick(COLORS, seed * 5 + 2);
  const pattern = pick(PATTERNS, seed * 7 + 3);
  const styleTags = [
    pick(STYLE_TAGS, seed * 11 + 4),
    pick(STYLE_TAGS, seed * 13 + 5),
  ].filter((tag, i, arr) => arr.indexOf(tag) === i);

  const warmthJitter = (seededRandom(seed * 17 + 6) - 0.5) * 2;
  const formalityJitter = (seededRandom(seed * 19 + 7) - 0.5) * 2;

  return {
    box,
    category,
    subcategory,
    color,
    pattern,
    styleTags,
    warmth: clamp(BASE_WARMTH[category] + warmthJitter, 1, 5),
    formality: clamp(BASE_FORMALITY[category] + formalityJitter, 1, 5),
  };
}

function mockDetectClothingItems(seedKey: string): DetectedClothingItem[] {
  const seed = hashString(seedKey);
  // Most wardrobe photos show one garment; occasionally simulate a flat-lay
  // with two items stacked top/bottom so the review flow has something to
  // exercise even without a real vision call.
  const twoItems = seededRandom(seed + 41) > 0.65;
  if (!twoItems) {
    return [mockDetectOne(seedKey, { x: 0.08, y: 0.05, width: 0.84, height: 0.9 })];
  }
  return [
    mockDetectOne(`${seedKey}|a`, { x: 0.1, y: 0.04, width: 0.8, height: 0.44 }),
    mockDetectOne(`${seedKey}|b`, { x: 0.1, y: 0.52, width: 0.8, height: 0.44 }),
  ];
}

async function realDetectClothingItems(
  imageBuffer: Buffer,
  mimeType: string
): Promise<DetectedClothingItem[] | null> {
  const prompt =
    "Identify every distinct clothing item or accessory visible in this photo (a flat-lay or " +
    "garment photo may contain more than one). For each item, return its bounding box as " +
    "fractions of the image width/height (x,y = top-left corner). Respond with ONLY a JSON " +
    "array, no other text, where each element matches: " +
    '{"box":{"x":0-1,"y":0-1,"width":0-1,"height":0-1},' +
    '"category":"top|bottom|outerwear|shoes|accessory|dress","subcategory":"string",' +
    '"color":"string","pattern":"string","styleTags":["string"],"warmth":1-5,"formality":1-5}';

  const result = await generateJsonFromImage<DetectedClothingItem[]>(prompt, imageBuffer, mimeType);
  if (!result || !Array.isArray(result) || result.length === 0) return null;
  return result;
}

export async function detectClothingItems(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DetectedClothingItem[]> {
  const real = await realDetectClothingItems(imageBuffer, mimeType);
  if (real) return real;
  return mockDetectClothingItems(`${filename}|${imageBuffer.length}`);
}

// ---------------------------------------------------------------------------
// Chat: conversational stylist with persistent preference memory
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  formalityHint: number;
  activityTags: string[];
  preferenceUpdates: {
    favoriteColors: string[];
    dislikedColors: string[];
    favoriteStyles: string[];
    dislikedStyles: string[];
    notes: string[];
  };
}

const EMPTY_PREFERENCE_UPDATES: ChatResult["preferenceUpdates"] = {
  favoriteColors: [],
  dislikedColors: [],
  favoriteStyles: [],
  dislikedStyles: [],
  notes: [],
};

const ACTIVITY_KEYWORDS: { keywords: string[]; tag: string; formality: number }[] = [
  { keywords: ["work", "office", "meeting", "client", "presentation"], tag: "work", formality: 4 },
  { keywords: ["interview"], tag: "interview", formality: 5 },
  { keywords: ["gym", "workout", "run", "yoga", "training"], tag: "athletic", formality: 1 },
  { keywords: ["date", "dinner", "dinner date", "restaurant"], tag: "date night", formality: 4 },
  { keywords: ["wedding", "gala", "formal event"], tag: "formal event", formality: 5 },
  { keywords: ["hike", "outdoors", "camping", "trail"], tag: "outdoors", formality: 1 },
  { keywords: ["beach", "pool", "vacation", "travel", "trip"], tag: "travel", formality: 2 },
  { keywords: ["party", "club", "night out"], tag: "night out", formality: 3 },
  { keywords: ["weekend", "errands", "relax", "chill", "home"], tag: "casual", formality: 1 },
  { keywords: ["school", "class", "lecture"], tag: "school", formality: 2 },
];

function extractMockPreferenceUpdates(message: string): ChatResult["preferenceUpdates"] {
  const lower = message.toLowerCase();
  const updates = { ...EMPTY_PREFERENCE_UPDATES, favoriteColors: [] as string[], dislikedColors: [] as string[], favoriteStyles: [] as string[], dislikedStyles: [] as string[], notes: [] as string[] };

  const lovePattern = /\b(love|like|prefer|favorite|favourite)\b[^.!?]*/g;
  const hatePattern = /\b(hate|dislike|don't like|avoid|never wear)\b[^.!?]*/g;

  for (const match of lower.match(lovePattern) ?? []) {
    for (const color of COLORS) if (match.includes(color)) updates.favoriteColors.push(color);
    for (const style of STYLE_TAGS) if (match.includes(style)) updates.favoriteStyles.push(style);
  }
  for (const match of lower.match(hatePattern) ?? []) {
    for (const color of COLORS) if (match.includes(color)) updates.dislikedColors.push(color);
    for (const style of STYLE_TAGS) if (match.includes(style)) updates.dislikedStyles.push(style);
  }
  return updates;
}

function mockChatWithStylist(message: string, preferences: UserPreferences): ChatResult {
  const lower = message.toLowerCase();
  const matches = ACTIVITY_KEYWORDS.filter((entry) => entry.keywords.some((kw) => lower.includes(kw)));
  const activityTags = matches.map((m) => m.tag);
  const formalityHint = matches.length
    ? Math.round(matches.reduce((sum, m) => sum + m.formality, 0) / matches.length)
    : 2;

  const preferenceUpdates = extractMockPreferenceUpdates(message);
  const learnedSomething =
    preferenceUpdates.favoriteColors.length ||
    preferenceUpdates.dislikedColors.length ||
    preferenceUpdates.favoriteStyles.length ||
    preferenceUpdates.dislikedStyles.length;

  const knownPrefs = [...preferences.favoriteColors, ...preferences.favoriteStyles].slice(0, 2);

  let reply = activityTags.length
    ? `Got it — sounds like ${activityTags.join(", ")} is on the agenda. I'll lean ${
        formalityHint >= 4 ? "polished" : formalityHint <= 1 ? "relaxed" : "smart-casual"
      } and factor in the weather when I put outfits together for you.`
    : "Thanks for the context! I'll factor that into your outfit plan.";

  if (learnedSomething) {
    reply += " Noted your taste there — I'll remember that for future picks.";
  } else if (knownPrefs.length) {
    reply += ` (Still keeping ${knownPrefs.join(" and ")} in mind from before.)`;
  }

  return { reply, formalityHint, activityTags, preferenceUpdates };
}

async function realChatWithStylist(
  message: string,
  history: ChatTurn[],
  preferences: UserPreferences
): Promise<ChatResult | null> {
  const recentHistory = history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "User" : "Stylist"}: ${t.content}`)
    .join("\n");

  const prompt =
    "You are a warm, encouraging personal stylist chatting with a user about their wardrobe and " +
    "week ahead. Use what you already know about their taste, and pick up on any new preferences " +
    "they mention (colors or styles they love/hate) so you can remember them long-term.\n\n" +
    `Known preferences so far:\n${JSON.stringify(preferences)}\n\n` +
    (recentHistory ? `Recent conversation:\n${recentHistory}\n\n` : "") +
    `User's new message: "${message}"\n\n` +
    "Respond with ONLY JSON matching this shape: " +
    '{"reply":"a short, warm, conversational reply (1-3 sentences)",' +
    '"formalityHint":1-5,"activityTags":["string"],' +
    '"preferenceUpdates":{"favoriteColors":["string"],"dislikedColors":["string"],' +
    '"favoriteStyles":["string"],"dislikedStyles":["string"],"notes":["string"]}}\n' +
    "Only include NEW preferences mentioned in this message in preferenceUpdates — leave arrays " +
    "empty if nothing new was mentioned. \"notes\" is for any other useful freeform detail worth " +
    "remembering (e.g. sizing, an upcoming trip).";

  const result = await generateJson<ChatResult>(prompt);
  if (!result || typeof result.reply !== "string") return null;
  return {
    reply: result.reply,
    formalityHint: result.formalityHint ?? 2,
    activityTags: result.activityTags ?? [],
    preferenceUpdates: { ...EMPTY_PREFERENCE_UPDATES, ...result.preferenceUpdates },
  };
}

export async function chatWithStylist(
  message: string,
  history: ChatTurn[],
  preferences: UserPreferences
): Promise<ChatResult> {
  const real = await realChatWithStylist(message, history, preferences);
  if (real) return real;
  return mockChatWithStylist(message, preferences);
}

// Lightweight, keyword-based activity/formality extraction for the outfit
// generator's free-text "what's going on this week" field — kept local
// (no API call) since it only nudges scoring weights, not a chat reply.
export function extractActivityContext(contextText: string): {
  formalityHint: number;
  activityTags: string[];
} {
  const lower = contextText.toLowerCase();
  const matches = ACTIVITY_KEYWORDS.filter((entry) => entry.keywords.some((kw) => lower.includes(kw)));
  const activityTags = matches.map((m) => m.tag);
  const formalityHint = matches.length
    ? Math.round(matches.reduce((sum, m) => sum + m.formality, 0) / matches.length)
    : 2;
  return { formalityHint, activityTags };
}

export function mergePreferences(
  current: UserPreferences,
  updates: ChatResult["preferenceUpdates"]
): UserPreferences {
  const merge = (base: string[], additions: string[], remove: string[]) =>
    Array.from(new Set([...base.filter((v) => !remove.includes(v)), ...additions]));

  return {
    favoriteColors: merge(current.favoriteColors, updates.favoriteColors, updates.dislikedColors),
    dislikedColors: merge(current.dislikedColors, updates.dislikedColors, updates.favoriteColors),
    favoriteStyles: merge(current.favoriteStyles, updates.favoriteStyles, updates.dislikedStyles),
    dislikedStyles: merge(current.dislikedStyles, updates.dislikedStyles, updates.favoriteStyles),
    notes: Array.from(new Set([...current.notes, ...updates.notes])).slice(-20),
  };
}

export function applyRatingToPreferences(
  preferences: UserPreferences,
  item: { color: string; styleTags: string[] },
  rating: number
): UserPreferences {
  if (rating >= 4) {
    return mergePreferences(preferences, {
      ...EMPTY_PREFERENCE_UPDATES,
      favoriteColors: [item.color],
      favoriteStyles: item.styleTags,
    });
  }
  if (rating <= 2) {
    return mergePreferences(preferences, {
      ...EMPTY_PREFERENCE_UPDATES,
      dislikedColors: [item.color],
      dislikedStyles: item.styleTags,
    });
  }
  return preferences;
}

// ---------------------------------------------------------------------------
// Outfit generation
// ---------------------------------------------------------------------------

function weatherWarmthTarget(weather: DayWeather | null): number {
  if (!weather) return 3; // neutral — no forecast to go on
  if (weather.tempHighF <= 35) return 5;
  if (weather.tempHighF <= 50) return 4;
  if (weather.tempHighF <= 65) return 3;
  if (weather.tempHighF <= 78) return 2;
  return 1;
}

function needsOuterwear(weather: DayWeather | null): boolean {
  if (!weather) return false; // unknown conditions — don't force a layer
  return weather.tempHighF <= 60 || weather.condition === "rainy" || weather.condition === "snowy" || weather.condition === "windy";
}

function preferenceAffinity(item: ClothingItem, preferences: UserPreferences): number {
  let affinity = 0;
  if (preferences.favoriteColors.includes(item.color)) affinity += 1.5;
  if (preferences.dislikedColors.includes(item.color)) affinity -= 1.5;
  if (item.styleTags.some((tag) => preferences.favoriteStyles.includes(tag))) affinity += 1.5;
  if (item.styleTags.some((tag) => preferences.dislikedStyles.includes(tag))) affinity -= 1.5;
  return affinity;
}

function scoreItem(
  item: ClothingItem,
  opts: {
    formalityHint: number;
    warmthTarget: number;
    itemScores: Record<string, number>;
    preferences: UserPreferences;
    seed: number;
  }
): number {
  const formalityFit = -Math.abs(item.formality - opts.formalityHint);
  const warmthFit = -Math.abs(item.warmth - opts.warmthTarget) * 1.2;
  const preference = (opts.itemScores[item.id] ?? 0) * 2;
  const affinity = preferenceAffinity(item, opts.preferences);
  const jitter = (seededRandom(opts.seed + hashString(item.id)) - 0.5) * 1.5;
  return formalityFit + warmthFit + preference + affinity + jitter;
}

function pickBest(
  candidates: ClothingItem[],
  opts: {
    formalityHint: number;
    warmthTarget: number;
    itemScores: Record<string, number>;
    preferences: UserPreferences;
    seed: number;
  }
): ClothingItem | null {
  if (candidates.length === 0) return null;
  return candidates
    .map((item) => ({ item, score: scoreItem(item, opts) }))
    .sort((a, b) => b.score - a.score)[0].item;
}

export interface PlanDay {
  date: string;
  location: string;
  weather: DayWeather | null;
}

export interface GenerateOutfitsParams {
  closet: ClothingItem[];
  days: PlanDay[];
  context: string;
  formalityHint: number;
  activityTags: string[];
  itemScores: Record<string, number>;
  preferences: UserPreferences;
}

export function generateWeeklyOutfits(params: GenerateOutfitsParams): OutfitSuggestion[] {
  const { closet, days, context, formalityHint, activityTags, itemScores, preferences } = params;
  const tops = closet.filter((i) => i.category === "top");
  const bottoms = closet.filter((i) => i.category === "bottom");
  const dresses = closet.filter((i) => i.category === "dress");
  const shoes = closet.filter((i) => i.category === "shoes");
  const outerwear = closet.filter((i) => i.category === "outerwear");
  const accessories = closet.filter((i) => i.category === "accessory");

  return days.map((day, dayIndex) => {
    const warmthTarget = weatherWarmthTarget(day.weather);
    const seed = hashString(`${day.date}|${context}|${dayIndex}`);
    const opts = { formalityHint, warmthTarget, itemScores, preferences, seed };

    const useDress = dresses.length > 0 && seededRandom(seed + 99) > 0.6;
    const chosen: ClothingItem[] = [];

    if (useDress) {
      const dress = pickBest(dresses, opts);
      if (dress) chosen.push(dress);
    } else {
      const top = pickBest(tops, opts);
      const bottom = pickBest(bottoms, opts);
      if (top) chosen.push(top);
      if (bottom) chosen.push(bottom);
    }

    const shoe = pickBest(shoes, opts);
    if (shoe) chosen.push(shoe);

    if (needsOuterwear(day.weather)) {
      const jacket = pickBest(outerwear, opts);
      if (jacket) chosen.push(jacket);
    }

    if (accessories.length && seededRandom(seed + 55) > 0.5) {
      const accessory = pickBest(accessories, opts);
      if (accessory) chosen.push(accessory);
    }

    const weatherSummary = day.weather
      ? `${day.weather.condition}, ${day.weather.tempLowF}-${day.weather.tempHighF}°F in ${day.location}`
      : "No location set — styled by your plans alone";
    const activitySummary = activityTags.length ? activityTags.join(", ") : "your day";
    const rationale = chosen.length
      ? `Picked for ${activitySummary}${day.weather ? ` with ${weatherSummary.toLowerCase()} in mind` : ""}.`
      : `Your closet doesn't have enough tagged items yet to build a full outfit for this day.`;

    const outfit: OutfitSuggestion = {
      id: crypto.randomUUID(),
      date: day.date,
      location: day.location,
      itemIds: chosen.map((i) => i.id),
      context,
      weatherSummary,
      rationale,
      vote: null,
      createdAt: new Date().toISOString(),
    };
    return outfit;
  });
}
