"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton, Stat } from "@/components/ui";
import { getStoredRewards } from "@/lib/rewardTracker";

/* ─── Win Checker (per bounty) ─────────────────────────── */

function WinChecker({
  bountyId,
  userAddress,
  onWin,
}: {
  bountyId: number;
  userAddress: `0x${string}`;
  onWin: (bountyId: number, isWinner: boolean) => void;
}) {
  const { bounty } = useBounty(BigInt(bountyId));

  // Read winner submission if finalized
  const { data: winnerSub } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "getSubmission",
    args: bounty?.finalized ? [BigInt(bountyId), bounty.winnerIndex] : undefined,
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured && !!bounty?.finalized },
  });

  useEffect(() => {
    if (!bounty?.finalized || !winnerSub) return;
    const winnerAddr = (winnerSub[0] as string).toLowerCase();
    const isWinner = winnerAddr === userAddress.toLowerCase();
    onWin(bountyId, isWinner);
  }, [bounty, winnerSub, bountyId, userAddress, onWin]);

  return null;
}

/* ─── Won Bounty Card ─────────────────────────────────── */

function WinCard({ bountyId, reward }: { bountyId: number; reward: bigint | null }) {
  const { bounty, isLoading } = useBounty(BigInt(bountyId));

  if (isLoading) {
    return (
      <Card>
        <CardBody className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
        </CardBody>
      </Card>
    );
  }

  if (!bounty) return null;

  return (
    <Link href={`/bounties/${bountyId}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover accent-line">
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">#{bountyId}</span>
            <Badge tone="green">Won</Badge>
          </div>
          <h3 className="text-sm font-medium text-white truncate">{bounty.title}</h3>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#555]">Submission #{bounty.winnerIndex.toString()}</span>
            {reward && reward > 0n ? (
              <span className="font-mono text-emerald-400">{formatEther(reward)} RITUAL</span>
            ) : (
              <span className="text-[#555]">Reward collected</span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

/* ─── Pending Bounty Card ─────────────────────────────── */

function SubmissionCheck({
  bountyId,
  index,
  userAddress,
  onFound,
}: {
  bountyId: number;
  index: number;
  userAddress: `0x${string}`;
  onFound: (index: number, isRevealed: boolean) => void;
}) {
  const { data } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "getSubmission",
    args: [BigInt(bountyId), BigInt(index)],
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured },
  });

  useEffect(() => {
    if (data && data[0].toLowerCase() === userAddress.toLowerCase()) {
      onFound(index, data[2] as boolean);
    }
  }, [data, userAddress, index, onFound]);

  return null;
}

function PendingCard({ bountyId, userAddress }: { bountyId: number; userAddress: `0x${string}` }) {
  const { bounty, isLoading } = useBounty(BigInt(bountyId));
  const [userSubIndex, setUserSubIndex] = useState<number>(-1);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleFound = useCallback(
    (index: number, revealed: boolean) => {
      setUserSubIndex(index);
      setIsRevealed(revealed);
    },
    []
  );

  const submissionCount = bounty ? Number(bounty.submissionCount) : 0;
  const hasSubmitted = userSubIndex !== -1;

  if (isLoading) {
    return (
      <Card>
        <CardBody className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
        </CardBody>
      </Card>
    );
  }

  if (!bounty || bounty.finalized || submissionCount === 0) return null;

  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];

  return (
    <>
      {Array.from({ length: submissionCount }, (_, i) => (
        <SubmissionCheck
          key={i}
          bountyId={bountyId}
          index={i}
          userAddress={userAddress}
          onFound={handleFound}
        />
      ))}

      {hasSubmitted && (
        <Link href={`/bounties/${bountyId}`}>
          <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover">
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#555]">#{bountyId}</span>
                <div className="flex gap-1.5">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {isRevealed ? (
                    <Badge tone="green">Revealed</Badge>
                  ) : (
                    <Badge tone="amber">Committed</Badge>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-medium text-white truncate">{bounty.title}</h3>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#555]">Submission #{userSubIndex}</span>
                {bounty.reward > 0n && (
                  <span className="font-mono text-[var(--accent-light)]">{formatEther(bounty.reward)} RITUAL</span>
                )}
              </div>
            </CardBody>
          </Card>
        </Link>
      )}
    </>
  );
}

/* ─── Main Page ────────────────────────────────────────── */

export default function MyWinsPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [winBounties, setWinBounties] = useState<Set<number>>(new Set());
  const [storedRewards, setStoredRewards] = useState<Record<string, string>>({});

  const { data: nextId } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured, refetchInterval: 30_000 },
  });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setStoredRewards(getStoredRewards()); }, []);

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : 0;
  const allIds = Array.from({ length: totalBounties }, (_, i) => i + 1);

  const handleWin = useCallback((bountyId: number, isWinner: boolean) => {
    if (!isWinner) return;
    setWinBounties((prev) => {
      if (prev.has(bountyId)) return prev;
      const next = new Set(prev);
      next.add(bountyId);
      return next;
    });
  }, []);

  // Compute total rewards from stored data
  let totalRewards = 0n;
  winBounties.forEach((id) => {
    const stored = storedRewards[String(id)];
    if (stored) totalRewards += BigInt(stored);
  });

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <div className="relative z-10 px-6 pt-16 pb-8 lg:pt-8 max-w-5xl mx-auto">
        <section className={`mb-6 fi ${mounted ? 'v' : ''}`}>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">My Wins</h1>
          <p className="mt-1 text-sm text-[#666]">Bounties you won + pending submissions</p>
        </section>

        {!isConnected ? (
          <section className={`fi ${mounted ? 'v' : ''} d3`}>
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-12 h-12 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.52.952m0 0a6.004 6.004 0 01-2.52-.952" />
              </svg>
              <p className="text-sm text-[#555]">Connect your wallet to see your wins</p>
            </div>
          </section>
        ) : (
          <section className={`fi ${mounted ? 'v' : ''} d3`}>
            {/* Invisible win checkers for all bounties */}
            {allIds.map((id) => (
              <WinChecker key={id} bountyId={id} userAddress={address!} onWin={handleWin} />
            ))}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Card>
                <CardBody>
                  <Stat
                    label="Total Rewards Won"
                    value={
                      <span className="text-emerald-400 font-mono">
                        {totalRewards > 0n ? `${formatEther(totalRewards)} RITUAL` : "—"}
                      </span>
                    }
                  />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat label="Bounties Won" value={winBounties.size.toString()} />
                </CardBody>
              </Card>
            </div>

            {/* Won bounties */}
            <div className="mt-6">
              <h2 className="text-[10px] uppercase tracking-[0.12em] text-[#444] mb-3 font-display font-semibold">Won</h2>
              {winBounties.size === 0 && (
                <p className="text-[12px] text-[#555] mb-3">No finalized wins yet</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from(winBounties).map((id) => {
                  const stored = storedRewards[String(id)];
                  const reward = stored ? BigInt(stored) : null;
                  return <WinCard key={id} bountyId={id} reward={reward} />;
                })}
              </div>
            </div>

            {/* Pending submissions */}
            <div className="mt-8">
              <h2 className="text-[10px] uppercase tracking-[0.12em] text-[#444] mb-3 font-display font-semibold">Pending Submissions</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allIds.map((id) => (
                  <PendingCard key={id} bountyId={id} userAddress={address!} />
                ))}
              </div>
            </div>

            {allIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-[#555]">No bounties on-chain yet</p>
              </div>
            )}
          </section>
        )}
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
