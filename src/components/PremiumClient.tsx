"use client";

import { useState } from "react";

const PERKS = [
  {
    title: "1:1 stylist matching",
    body: "Get paired with a human stylist who reviews your closet and weekly plans, then fine-tunes outfit picks beyond what the AI suggests.",
  },
  {
    title: "Brand partner drops",
    body: "See new pieces from partner brands curated to match colors and styles you already wear and like.",
  },
  {
    title: "Unlimited trip planning",
    body: "Plan outfits for multiple destinations at once with full multi-city weather lookahead.",
  },
];

export default function PremiumClient() {
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setStatus("sending");
    const res = await fetch("/api/stylist-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-2xl bg-accent-soft p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Premium</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Style help from an actual human</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          This is a preview of our upcoming premium tier. Tell us a bit about yourself and we&apos;ll
          reach out when stylist matching and brand partner drops go live.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PERKS.map((perk) => (
          <div key={perk.title} className="rounded-2xl border border-border bg-surface p-5">
            <p className="font-semibold">{perk.title}</p>
            <p className="mt-1 text-sm text-muted">{perk.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        {status === "sent" ? (
          <p className="text-center font-medium text-success">
            Thanks, {form.name.split(" ")[0] || "there"}! A stylist will reach out to {form.email} as
            soon as premium opens up.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="font-semibold">Request early access to a stylist</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <textarea
              placeholder="Anything specific you'd want a stylist's help with?"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              rows={3}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Request access"}
            </button>
            {status === "error" && (
              <p className="text-sm text-danger">Something went wrong — try again.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
