import fs from "fs";
import path from "path";
import type { AppData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY_DATA: AppData = {
  items: [],
  outfits: [],
  chatMessages: [],
  itemScores: {},
  stylistRequests: [],
};

function ensureDb(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DATA, null, 2));
  }
}

export function readDb(): AppData {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AppData>;
  return { ...EMPTY_DATA, ...parsed };
}

export function writeDb(data: AppData): void {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function withDb<T>(mutator: (data: AppData) => T): T {
  const data = readDb();
  const result = mutator(data);
  writeDb(data);
  return result;
}
