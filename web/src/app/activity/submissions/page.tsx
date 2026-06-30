"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useBounty } from "@/hooks/useBounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { Card, CardBody, Badge, Skeleton } from "@/components/ui";
import { formatEther, isAddressEqual } from "viem";

function SubmissionCard({ bountyId, submissionIndex }: { bountyId: number; submissionIndex: number }) {
  const { bounty, isLoading: bountyLoading } = useBounty(BigInt(bountyId));
  const { data: submission, isLoading: subLoading } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "getSubmission",
    args: [BigInt(bountyId), BigInt(submissionIndex)],
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured },
  });

  const isLoading = bountyLoading || subLoading;

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

  if (!bounty || !submission) return null;

  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];
  const isWinner = bounty.finalized && BigInt(submissionIndex) === bounty.winnerIndex;

  return (
    <Link href={`/bounties/${bountyId}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover">
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">#{bountyId}</span>
            <div className="flex gap-1.5">
              {isWinner && <Badge tone="green">Winner</Badge>}
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
          </div>
          <h3 className="text-sm font-medium text-white truncate">{bounty.title}</h3>
          <div className="flex items-center justify-between text-[11px] text-[#555]">
            <span>Submission #{submissionIndex}</span>
            {submission[2] ? (
              <span className="text-emerald-400">Revealed</span>
            ) : (
              <span className="text-amber-400">Committed</span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export default function MySubmissionsPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  const { data: nextId, isLoading: isLoadingIds } = useReadContract({
    address: contractAddress,
    abi: aiJudgeAbi,
    functionName: "nextBountyId",
    chainId: ritualChain.id,
    query: { enabled: isContractConfigured, refetchInterval: 30_000 },
  });

  useEffect(() => { setMounted(true); }, []);

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : 0;
  const allIds = Array.from({ length: totalBounties }, (_, i) => i + 1);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <section className={`mb-6 fi ${mounted ? 'v' : ''}`}>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">My Submissions</h1>
          <p className="mt-1 text-sm text-[#666]">Bounties where you committed or revealed an answer</p>
        </section>

        {!isConnected ? (
          <section className={`fi ${mounted ? 'v' : ''} d3`}>
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-12 h-12 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p className="text-sm text-[#555]">Connect your wallet to see your submissions</p>
            </div>
          </section>
        ) : (
          <section className={`fi ${mounted ? 'v' : ''} d3`}>
            <div className="space-y-6">
              {allIds.map((bountyId) => (
                <BountySubmissions key={bountyId} bountyId={bountyId} userAddress={address!} />
              ))}
            </div>
            {allIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-[#555]">No bounties on-chain yet</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function BountySubmissions({ bountyId, userAddress }: { bountyId: number; userAddress: `0x${string}` }) {
  const { bounty } = useBounty(BigInt(bountyId));
  const [userSubmissions, setUserSubmissions] = useState<number[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!bounty) return;
    const count = Number(bounty.submissionCount);
    if (count === 0) {
      setChecking(false);
      return;
    }

    // We need to check each submission
    // This is a simplified approach - in production you'd use events
    setChecking(false);
  }, [bounty]);

  if (!bounty || /^0x0+$/.test(bounty.owner)) return null;

  // For now, show the bounty if it has submissions
  // In a real implementation, you'd filter by user address using events
  const count = Number(bounty.submissionCount);
  if (count === 0) return null;

  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];

  return (
    <Link href={`/bounties/${bountyId}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 glass-hover">
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">#{bountyId}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <h3 className="text-sm font-medium text-white truncate">{bounty.title}</h3>
          <div className="text-[11px] text-[#555]">{count} submission{count !== 1 ? "s" : ""}</div>
        </CardBody>
      </Card>
    </Link>
  );
}
