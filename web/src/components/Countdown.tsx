"use client";

import { useNow } from "@/hooks/useNow";

function formatRemaining(diffMs: number): string {
  if (diffMs <= 0) return "0s";
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export function Countdown({
  deadline,
  label,
  tone = "zinc",
}: {
  deadline: bigint;
  label: string;
  tone?: "green" | "amber" | "zinc";
}) {
  const now = useNow(1000); // tick every 1s for live countdown
  const diff = Number(deadline) - now;

  if (now === 0) return null; // SSR hydration guard

  const color =
    tone === "green"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-zinc-400";

  if (diff <= 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="inline-block h-2 w-2 rounded-full bg-zinc-600" />
        <span>{label} — ended</span>
      </div>
    );
  }

  // Pulse when < 5 minutes
  const urgent = diff < 5 * 60 * 1000;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          tone === "green"
            ? "bg-emerald-400"
            : tone === "amber"
              ? "bg-amber-400"
              : "bg-zinc-400"
        } ${urgent ? "animate-pulse" : ""}`}
      />
      <span className="text-zinc-400">{label}</span>
      <span className={`font-mono font-medium ${color}`}>
        {formatRemaining(diff)}
      </span>
    </div>
  );
}
