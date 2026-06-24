import { NextRequest, NextResponse } from "next/server";
import { chatWithStylist, mergePreferences, type ChatTurn } from "@/lib/ai";
import { withDb } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

export async function GET() {
  const { chatMessages, preferences } = withDb((data) => ({
    chatMessages: data.chatMessages,
    preferences: data.preferences,
  }));
  return NextResponse.json({ chatMessages, preferences });
}

export async function POST(request: NextRequest) {
  const { message } = (await request.json()) as { message?: string };
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { history, preferences, closet } = withDb((data) => ({
    history: data.chatMessages.slice(-8).map(
      (m): ChatTurn => ({ role: m.role, content: m.content })
    ),
    preferences: data.preferences,
    closet: data.items,
  }));

  const result = await chatWithStylist(message, history, preferences, closet);

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  };
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: result.reply,
    createdAt: new Date().toISOString(),
  };

  const updatedPreferences = withDb((data) => {
    data.chatMessages.push(userMessage, assistantMessage);
    data.preferences = mergePreferences(data.preferences, result.preferenceUpdates);
    return data.preferences;
  });

  return NextResponse.json({
    userMessage,
    assistantMessage,
    context: result,
    preferences: updatedPreferences,
  });
}
