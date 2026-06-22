export type ClothingCategory =
  | "top"
  | "bottom"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "dress";

export interface ClothingItem {
  id: string;
  imageUrl: string;
  originalFilename: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  pattern: string;
  styleTags: string[];
  warmth: number; // 1 (very light) - 5 (very warm)
  formality: number; // 1 (very casual) - 5 (very formal)
  createdAt: string;
}

export interface DayWeather {
  date: string; // ISO date, yyyy-mm-dd
  location: string;
  tempHighF: number;
  tempLowF: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "windy";
  precipitationChance: number; // 0-100
}

export interface OutfitSuggestion {
  id: string;
  date: string;
  location: string;
  itemIds: string[];
  context: string;
  weatherSummary: string;
  rationale: string;
  vote: "up" | "down" | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface StylistRequest {
  id: string;
  name: string;
  email: string;
  note: string;
  createdAt: string;
}

export interface AppData {
  items: ClothingItem[];
  outfits: OutfitSuggestion[];
  chatMessages: ChatMessage[];
  itemScores: Record<string, number>;
  stylistRequests: StylistRequest[];
}
