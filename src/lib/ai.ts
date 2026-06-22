import Anthropic from "@anthropic-ai/sdk";
import { hashString, pick, seededRandom } from "./hash";
import type {
  ClothingCategory,
  ClothingItem,
  DayWeather,
  OutfitSuggestion,
} from "./types";

const MODEL = "claude-sonnet-4-5";

function anthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Clothing classification (used right after a wardrobe photo is uploaded)
// ---------------------------------------------------------------------------

export interface ClassifiedClothing {
  category: ClothingCategory;
  subcategory: string;
  color: string;
  pattern: string;
  styleTags: string[];
  warmth: number;
  formality: number;
}

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
  top: 2,
  bottom: 2,
  outerwear: 4,
  shoes: 2,
  accessory: 2,
  dress: 2,
};

const BASE_FORMALITY: Record<ClothingCategory, number> = {
  top: 2,
  bottom: 2,
  outerwear: 3,
  shoes: 2,
  accessory: 2,
  dress: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function mockClassifyClothing(seedKey: string): ClassifiedClothing {
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
    category,
    subcategory,
    color,
    pattern,
    styleTags,
    warmth: clamp(BASE_WARMTH[category] + warmthJitter, 1, 5),
    formality: clamp(BASE_FORMALITY[category] + formalityJitter, 1, 5),
  };
}

async function realClassifyClothing(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ClassifiedClothing | null> {
  const client = anthropicClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text:
                "Identify this clothing item. Respond with ONLY JSON matching this shape: " +
                '{"category":"top|bottom|outerwear|shoes|accessory|dress","subcategory":"string",' +
                '"color":"string","pattern":"string","styleTags":["string"],"warmth":1-5,"formality":1-5}',
            },
          ],
        },
      ],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    const json = JSON.parse(textBlock.text.trim());
    return json as ClassifiedClothing;
  } catch {
    return null;
  }
}

export async function classifyClothing(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ClassifiedClothing> {
  const real = await realClassifyClothing(imageBuffer, mimeType);
  if (real) return real;
  return mockClassifyClothing(`${filename}|${imageBuffer.length}`);
}

// ---------------------------------------------------------------------------
// Chat context extraction (used to read "what are you up to" messages)
// ---------------------------------------------------------------------------

export interface ChatContext {
  formalityHint: number; // 1-5
  activityTags: string[];
  reply: string;
}

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

function mockExtractChatContext(message: string): ChatContext {
  const lower = message.toLowerCase();
  const matches = ACTIVITY_KEYWORDS.filter((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  );

  const activityTags = matches.map((m) => m.tag);
  const formalityHint = matches.length
    ? Math.round(matches.reduce((sum, m) => sum + m.formality, 0) / matches.length)
    : 2;

  const reply = activityTags.length
    ? `Got it — sounds like ${activityTags.join(", ")} is on the agenda. I'll lean ${
        formalityHint >= 4 ? "polished" : formalityHint <= 1 ? "relaxed" : "smart-casual"
      } and factor in the weather when I put outfits together for you.`
    : "Thanks for the context! I'll keep that in mind and factor in the weather when I plan your outfits.";

  return { formalityHint, activityTags, reply };
}

async function realExtractChatContext(message: string): Promise<ChatContext | null> {
  const client = anthropicClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content:
            `A user is describing their plans to a personal stylist app: "${message}"\n\n` +
            "Respond with ONLY JSON: " +
            '{"formalityHint":1-5,"activityTags":["string"],"reply":"a short, warm, helpful one or two sentence reply to the user"}',
        },
      ],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    return JSON.parse(textBlock.text.trim()) as ChatContext;
  } catch {
    return null;
  }
}

export async function extractChatContext(message: string): Promise<ChatContext> {
  const real = await realExtractChatContext(message);
  if (real) return real;
  return mockExtractChatContext(message);
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

function scoreItem(
  item: ClothingItem,
  opts: {
    formalityHint: number;
    warmthTarget: number;
    itemScores: Record<string, number>;
    seed: number;
  }
): number {
  const formalityFit = -Math.abs(item.formality - opts.formalityHint);
  const warmthFit = -Math.abs(item.warmth - opts.warmthTarget) * 1.2;
  const preference = (opts.itemScores[item.id] ?? 0) * 2;
  const jitter = (seededRandom(opts.seed + hashString(item.id)) - 0.5) * 1.5;
  return formalityFit + warmthFit + preference + jitter;
}

function pickBest(
  candidates: ClothingItem[],
  opts: { formalityHint: number; warmthTarget: number; itemScores: Record<string, number>; seed: number }
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
}

export function generateWeeklyOutfits(params: GenerateOutfitsParams): OutfitSuggestion[] {
  const { closet, days, context, formalityHint, activityTags, itemScores } = params;
  const tops = closet.filter((i) => i.category === "top");
  const bottoms = closet.filter((i) => i.category === "bottom");
  const dresses = closet.filter((i) => i.category === "dress");
  const shoes = closet.filter((i) => i.category === "shoes");
  const outerwear = closet.filter((i) => i.category === "outerwear");
  const accessories = closet.filter((i) => i.category === "accessory");

  return days.map((day, dayIndex) => {
    const warmthTarget = weatherWarmthTarget(day.weather);
    const seed = hashString(`${day.date}|${context}|${dayIndex}`);
    const opts = { formalityHint, warmthTarget, itemScores, seed };

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
