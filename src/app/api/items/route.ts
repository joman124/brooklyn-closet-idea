import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";

export async function GET() {
  const items = withDb((data) => data.items);
  return NextResponse.json({ items });
}
