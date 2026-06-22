import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import type { StylistRequest } from "@/lib/types";

export async function GET() {
  const stylistRequests = withDb((data) => data.stylistRequests);
  return NextResponse.json({ stylistRequests });
}

export async function POST(request: NextRequest) {
  const { name, email, note } = (await request.json()) as {
    name?: string;
    email?: string;
    note?: string;
  };

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const stylistRequest: StylistRequest = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim(),
    note: note?.trim() || "",
    createdAt: new Date().toISOString(),
  };

  withDb((data) => {
    data.stylistRequests.push(stylistRequest);
  });

  return NextResponse.json({ stylistRequest }, { status: 201 });
}
