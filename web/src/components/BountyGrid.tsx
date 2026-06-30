"use client";

import { useRef, useEffect } from "react";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton } from "@/components/ui";
import { shortenAddress } from "@/lib/format";
import { formatEther } from "viem";
import { BountyView } from "@/components/BountyView";

function BountyCard({
  id,
  isSelected,
  onSelect,
}: {
  id: string;
  isSelected: boolean;
  onSelect: (id: bigint) => void;
}) {
  const { bounty, isLoading } = useBounty(BigInt(id));

  if (isLoading) {
    return (
      <Card className="cursor-pointer">
        <CardBody className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-16" />
        </CardBody>
      </Card>
    );
  }

  if (!bounty || /^0x0+$/.test(bounty.owner)) {
    return (
      <Card className="cursor-pointer opacity-50">
        <CardBody>
          <div className="text-xs text-[#555]">#{id} — not found</div>
        </CardBody>
      </Card>
    );
  }

  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];

  return (
    <div
      className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? "accent-line glow-accent ring-1 ring-[var(--accent)]/30 rounded-xl" : ""}`}
      onClick={() => onSelect(BigInt(id))}
    >
      <Card>
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">#{id}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <h3 className="text-sm font-medium text-white truncate">
            {bounty.title}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-[#555]">
            <span>{bounty.submissionCount.toString()} submissions</span>
            {bounty.reward > 0n && (
              <span className="font-mono text-[var(--accent-light)]">
                {formatEther(bounty.reward)} RITUAL
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#444] font-mono">
            by {shortenAddress(bounty.owner, 4)}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function BountyGrid({
  selectedId,
  onSelect,
  recentIds,
}: {
  selectedId: bigint | null;
  onSelect: (id: bigint) => void;
  recentIds: string[];
}) {
  const detailRef = useRef<HTMLDivElement>(null);

  // Scroll to inline detail when selection changes
  useEffect(() => {
    if (selectedId !== null && detailRef.current) {
      const t = setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [selectedId]);

  if (recentIds.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] font-display font-semibold">
          Recent Bounties
        </span>
        <span className="text-[10px] text-[#444]">({recentIds.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recentIds.map((id) => (
          <BountyCard
            key={id}
            id={id}
            isSelected={selectedId?.toString() === id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Inline bounty detail — shows right below the grid */}
      {selectedId !== null && (
        <div ref={detailRef} className="mt-4 pt-4 border-t border-white/[0.06]">
          <BountyView bountyId={selectedId} />
        </div>
      )}
    </section>
  );
}
