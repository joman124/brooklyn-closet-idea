import { NextRequest, NextResponse } from "next/server";
import { applyRatingToPreferences } from "@/lib/ai";
import { withDb } from "@/lib/db";
import { deleteUploadedImage } from "@/lib/storage";
import type { ClothingCategory, ItemRating } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    category: ClothingCategory;
    subcategory: string;
    color: string;
    pattern: string;
    styleTags: string[];
    warmth: number;
    formality: number;
  }>;

  const updated = withDb((data) => {
    const item = data.items.find((i) => i.id === id);
    if (!item) return null;
    if (body.category) item.category = body.category;
    if (body.subcategory !== undefined) item.subcategory = body.subcategory;
    if (body.color !== undefined) item.color = body.color;
    if (body.pattern !== undefined) item.pattern = body.pattern;
    if (body.styleTags) item.styleTags = body.styleTags;
    if (body.warmth !== undefined) item.warmth = body.warmth;
    if (body.formality !== undefined) item.formality = body.formality;
    return item;
  });

  if (!updated) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { rating?: number };
  const rating = body.rating;

  const { removed, preferences } = withDb((data) => {
    const index = data.items.findIndex((item) => item.id === id);
    if (index === -1) return { removed: null, preferences: data.preferences };
    const [item] = data.items.splice(index, 1);
    delete data.itemScores[id];
    data.outfits.forEach((outfit) => {
      outfit.itemIds = outfit.itemIds.filter((itemId) => itemId !== id);
    });

    if (typeof rating === "number" && rating >= 1 && rating <= 5) {
      const ratingRecord: ItemRating = {
        id: crypto.randomUUID(),
        itemId: item.id,
        category: item.category,
        color: item.color,
        styleTags: item.styleTags,
        rating,
        createdAt: new Date().toISOString(),
      };
      data.itemRatings.push(ratingRecord);
      data.preferences = applyRatingToPreferences(data.preferences, item, rating);
    }

    return { removed: item, preferences: data.preferences };
  });

  if (!removed) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  deleteUploadedImage(removed.imageUrl);
  return NextResponse.json({ ok: true, preferences });
}
