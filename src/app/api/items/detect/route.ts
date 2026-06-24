import { NextRequest, NextResponse } from "next/server";
import { detectClothingItems } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detections = await detectClothingItems(buffer, file.name, file.type || "image/jpeg");

  return NextResponse.json({ detections });
}
