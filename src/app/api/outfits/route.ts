import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";

export async function GET() {
  const { outfits, closet } = withDb((data) => ({
    outfits: data.outfits,
    closet: data.items,
  }));
  return NextResponse.json({ outfits, closet });
}
