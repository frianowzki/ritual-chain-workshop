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
  const now = useNow(1000);
  const diff = Number(deadline) - now;

  if (now === 0) return null;

  const bgMap = {
    green: "bg-emerald-500/[0.06] border-emerald-500/20",
    amber: "bg-amber-500/[0.06] border-amber-500/20",
    zinc: "bg-white/[0.03] border-white/[0.06]",
  };

  const dotMap = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    zinc: "bg-[#555]",
  };

  const textMap = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    zinc: "text-[#888]",
  };

  if (diff <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <span className="inline-block h-2 w-2 rounded-full bg-[#444]" />
        <span className="text-xs text-[#555]">{label}</span>
        <span className="text-xs font-mono text-[#444]">ended</span>
      </div>
    );
  }

  const urgent = diff < 5 * 60 * 1000;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${bgMap[tone]} transition-colors`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotMap[tone]} ${urgent ? "animate-pulse" : ""}`} />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-[#555]">{label}</span>
        <span className={`font-mono text-lg font-bold tracking-tight ${textMap[tone]}`}>
          {formatRemaining(diff)}
        </span>
      </div>
    </div>
  );
}
