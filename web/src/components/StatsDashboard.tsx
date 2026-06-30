"use client";

import { useReadContract } from "wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { Card, CardBody, Skeleton } from "@/components/ui";

export function StatsDashboard() {
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

  if (!isContractConfigured) return null;

  const totalBounties = nextId !== undefined ? Number(nextId) - 1 : undefined;

  return (
    <Card className="overflow-hidden">
      <CardBody className="p-0">
        <div className="flex items-center divide-x divide-white/[0.06]">
          {/* Total Bounties */}
          <div className="flex-1 flex items-center gap-3 px-5 py-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent)]/10">
              <svg className="w-4.5 h-4.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#555] mb-0.5">Bounties</p>
              <p className="text-xl font-display font-bold text-white">
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : totalBounties !== undefined ? (
                  totalBounties
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex-1 flex items-center gap-3 px-5 py-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#555] mb-0.5">Status</p>
              <p className="text-xl font-display font-bold text-emerald-400">Live</p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
