"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton } from "@/components/ui";
import { shortenAddress } from "@/lib/format";

/* ─── Single Live Bounty Card ──────────────────────────── */

function LiveBountyCard({
  bountyId,
  onChecked,
}: {
  bountyId: number;
  onChecked: (isLive: boolean) => void;
}) {
  const { bounty, isLoading } = useBounty(BigInt(bountyId));

  useEffect(() => {
    if (!isLoading) {
      const status = bounty ? getBountyStatus(bounty) : null;
      onChecked(status === "commit" || status === "reveal");
    }
  }, [bounty, isLoading, onChecked]);

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
  const { data: nextId, isLoading: idLoading } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured, refetchInterval: 30_000 },
  });

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : 0;
  const allIds = useMemo(() => Array.from({ length: totalBounties }, (_, i) => i + 1), [totalBounties]);

  // Track how many cards checked, and how many are live
  const checkedRef = useRef(0);
  const liveRef = useRef(0);
  const [allChecked, setAllChecked] = useState(false);
  const [anyLive, setAnyLive] = useState(false);

  // Reset when bounty list changes
  useEffect(() => {
    checkedRef.current = 0;
    liveRef.current = 0;
    setAllChecked(false);
    setAnyLive(false);
  }, [totalBounties]);

  const handleChecked = (isLive: boolean) => {
    checkedRef.current += 1;
    if (isLive) liveRef.current += 1;

    if (checkedRef.current >= allIds.length) {
      setAllChecked(true);
      setAnyLive(liveRef.current > 0);
    }
  };

  if (!idLoading && allIds.length === 0) return null;

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
          <LiveBountyCard key={id} bountyId={id} onChecked={handleChecked} />
        ))}
      </div>

      {/* Empty state — no live bounties */}
      {allChecked && !anyLive && (
        <Card className="border-dashed border-white/[0.04] mt-3">
          <CardBody className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 ring-1 ring-white/[0.04]">
              <svg className="w-6 h-6 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-[#666] font-medium">No live bounties right now</p>
            <p className="text-[11px] text-[#444] mt-1.5">Check back soon or create one yourself</p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
