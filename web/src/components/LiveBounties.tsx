"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META, type Bounty } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton } from "@/components/ui";
import { shortenAddress } from "@/lib/format";

/* ─── Single Live Bounty Card ──────────────────────────── */

function LiveBountyCard({ bountyId }: { bountyId: number }) {
  const { bounty, isLoading } = useBounty(BigInt(bountyId));

  if (isLoading) {
    return (
      <Card>
        <CardBody className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-16" />
        </CardBody>
      </Card>
    );
  }

  if (!bounty) return null;

  const status = getBountyStatus(bounty);
  // Only show live bounties (commit or reveal phase)
  if (status !== "commit" && status !== "reveal") return null;

  const meta = STATUS_META[status];

  return (
    <Link href={`/bounties/${bountyId}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover accent-line">
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">#{bountyId}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <h3 className="text-sm font-medium text-white truncate">{bounty.title}</h3>
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
    </Link>
  );
}

/* ─── Live Bounties Section ────────────────────────────── */

export function LiveBounties() {
  const { data: nextId } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured, refetchInterval: 30_000 },
  });

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : 0;
  const allIds = Array.from({ length: totalBounties }, (_, i) => i + 1);

  if (allIds.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.1em] text-emerald-400/80 font-display font-semibold">
          Live Bounties
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allIds.map((id) => (
          <LiveBountyCard key={id} bountyId={id} />
        ))}
      </div>
    </section>
  );
}
