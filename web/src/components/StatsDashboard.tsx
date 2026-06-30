"use client";

import { useReadContract } from "wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { Card, CardBody, Stat, Skeleton } from "@/components/ui";

export function StatsDashboard() {
  // nextBountyId returns the NEXT id, so total = nextBountyId - 1
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
    <section className="grid grid-cols-2 gap-3">
      <Card>
        <CardBody>
          <Stat
            label="Total Bounties"
            value={
              isLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : totalBounties !== undefined ? (
                totalBounties.toString()
              ) : (
                "—"
              )
            }
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Stat
            label="Status"
            value={
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            }
          />
        </CardBody>
      </Card>
    </section>
  );
}
