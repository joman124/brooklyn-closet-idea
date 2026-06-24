import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { saveUploadedImage } from "@/lib/storage";
import type { ClothingCategory, ClothingItem } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const originalFilename = String(formData.get("originalFilename") ?? file.name);
  const category = String(formData.get("category") ?? "top") as ClothingCategory;
  const subcategory = String(formData.get("subcategory") ?? "");
  const color = String(formData.get("color") ?? "");
  const pattern = String(formData.get("pattern") ?? "solid");
  const styleTags = JSON.parse(String(formData.get("styleTags") ?? "[]")) as string[];
  const warmth = Number(formData.get("warmth") ?? 2);
  const formality = Number(formData.get("formality") ?? 2);

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = saveUploadedImage(buffer, file.type);

  const item: ClothingItem = {
    id: crypto.randomUUID(),
    imageUrl,
    originalFilename,
    category,
    subcategory,
    color,
    pattern,
    styleTags,
    warmth,
    formality,
    createdAt: new Date().toISOString(),
  };

  withDb((data) => {
    data.items.push(item);
  });

  return NextResponse.json({ item }, { status: 201 });
}
