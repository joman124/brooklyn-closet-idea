import { NextRequest, NextResponse } from "next/server";
import { extractChatContext } from "@/lib/ai";
import { withDb } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

export async function GET() {
  const chatMessages = withDb((data) => data.chatMessages);
  return NextResponse.json({ chatMessages });
}

export async function POST(request: NextRequest) {
  const { message } = (await request.json()) as { message?: string };
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const context = await extractChatContext(message);

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  };
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: context.reply,
    createdAt: new Date().toISOString(),
  };

  withDb((data) => {
    data.chatMessages.push(userMessage, assistantMessage);
  });

  return NextResponse.json({ userMessage, assistantMessage, context });
}
