import { NextRequest, NextResponse } from "next/server";
import { classifyClothing } from "@/lib/ai";
import { withDb } from "@/lib/db";
import { saveUploadedImage } from "@/lib/storage";
import type { ClothingItem } from "@/lib/types";

export async function GET() {
  const items = withDb((data) => data.items);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const created: ClothingItem[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageUrl = saveUploadedImage(buffer, file.name);
    const classification = await classifyClothing(buffer, file.name, file.type || "image/jpeg");

    const item: ClothingItem = {
      id: crypto.randomUUID(),
      imageUrl,
      originalFilename: file.name,
      createdAt: new Date().toISOString(),
      ...classification,
    };
    created.push(item);
  }

  withDb((data) => {
    data.items.push(...created);
  });

  return NextResponse.json({ items: created }, { status: 201 });
}
