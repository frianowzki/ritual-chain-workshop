"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton } from "@/components/ui";
import { shortenAddress } from "@/lib/format";
import { formatEther } from "viem";

function BountyCard({ id }: { id: number }) {
  const { bounty, isLoading } = useBounty(BigInt(id));

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

  if (!bounty || /^0x0+$/.test(bounty.owner)) {
    return null; // Skip non-existent bounties
  }

  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];

  return (
    <Link href={`/bounties/${id}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover">
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
    </Link>
  );
}

export default function BountiesPage() {
  const [mounted, setMounted] = useState(false);

  const { data: nextId, isLoading } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: {
      enabled: isContractConfigured,
      refetchInterval: 30_000,
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : 0;
  const bountyIds = Array.from({ length: totalBounties }, (_, i) => i + 1);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <div className="relative z-10 px-6 pt-16 pb-8 lg:pt-8 max-w-5xl mx-auto">
        {/* Header */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                All Bounties
              </h1>
              <p className="mt-1 text-sm text-[#666]">
                {isLoading ? "Loading…" : `${totalBounties} bounty${totalBounties !== 1 ? "ies" : ""} on-chain`}
              </p>
            </div>
            <Link
              href="/bounties/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-xs font-semibold tracking-wide hover:bg-[var(--accent-dark)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create
            </Link>
          </div>
        </section>

        {/* Grid */}
        <section className={`fi ${mounted ? 'v' : ''} d3`}>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardBody className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : bountyIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-12 h-12 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              <p className="text-sm text-[#555]">No bounties found on-chain.</p>
              <Link href="/bounties/create" className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                Create the first one →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bountyIds.map((id) => (
                <BountyCard key={id} id={id} />
              ))}
            </div>
          )}
        </section>
        {/* Mobile footer */}
        <footer className="mt-12 mb-6 flex flex-col items-center gap-2 lg:hidden">
          <div className="w-8 h-px bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-[10px] text-[#444] tracking-wide">
            <span>Built by <span className="text-[var(--accent)] font-medium">Frianowzki</span></span>
            <a href="https://github.com/frianowzki/ritual-chain-workshop" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors" title="GitHub">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
