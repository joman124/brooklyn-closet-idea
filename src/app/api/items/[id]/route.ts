import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { deleteUploadedImage } from "@/lib/storage";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const removed = withDb((data) => {
    const index = data.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const [item] = data.items.splice(index, 1);
    delete data.itemScores[id];
    data.outfits.forEach((outfit) => {
      outfit.itemIds = outfit.itemIds.filter((itemId) => itemId !== id);
    });
    return item;
  });

  if (!removed) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  deleteUploadedImage(removed.imageUrl);
  return NextResponse.json({ ok: true });
}
