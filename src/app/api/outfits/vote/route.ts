import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";

type Vote = "up" | "down" | null;

const VOTE_EFFECT: Record<"up" | "down" | "none", number> = {
  up: 1,
  down: -1,
  none: 0,
};

function effectOf(vote: Vote): number {
  if (vote === "up") return VOTE_EFFECT.up;
  if (vote === "down") return VOTE_EFFECT.down;
  return VOTE_EFFECT.none;
}

export async function POST(request: NextRequest) {
  const { outfitId, vote } = (await request.json()) as { outfitId?: string; vote?: Vote };

  if (!outfitId || (vote !== "up" && vote !== "down" && vote !== null)) {
    return NextResponse.json({ error: "outfitId and a valid vote are required" }, { status: 400 });
  }

  const result = withDb((data) => {
    const outfit = data.outfits.find((o) => o.id === outfitId);
    if (!outfit) return null;

    const delta = effectOf(vote) - effectOf(outfit.vote);
    if (delta !== 0) {
      for (const itemId of outfit.itemIds) {
        data.itemScores[itemId] = (data.itemScores[itemId] ?? 0) + delta;
      }
    }
    outfit.vote = vote;
    return outfit;
  });

  if (!result) {
    return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
  }

  return NextResponse.json({ outfit: result });
}
