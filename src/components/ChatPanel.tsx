"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void>;
}

export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    setIsSending(true);
    const message = draft;
    setDraft("");
    try {
      await onSend(message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div>
        <p className="font-semibold">Tell your stylist what&apos;s going on</p>
        <p className="text-sm text-muted">
          e.g. &ldquo;I have client meetings Mon-Wed, then a hike Saturday and a dinner date Saturday night.&rdquo;
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1" style={{ maxHeight: 280 }}>
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages yet — say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "ml-auto bg-accent text-white"
                  : "bg-accent-soft text-foreground"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What's your week look like?"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isSending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
