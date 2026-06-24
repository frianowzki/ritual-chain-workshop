"use client";

import { useReadContract } from "wagmi";
import commitRevealAbi from "@/abi/CommitRevealBounty";
import { crContractAddress, isCRContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { parseCRBounty, type CRBounty } from "@/lib/bounty";

/** Read + parse a commit-reveal bounty, polling so phase flips automatically. */
export function useCRBounty(bountyId?: bigint) {
  const enabled = bountyId !== undefined && isCRContractConfigured;

  const query = useReadContract({
    address: crContractAddress,
    abi: commitRevealAbi,
    functionName: "getBounty",
    args: bountyId !== undefined ? [bountyId] : undefined,
    chainId: ritualChain.id,
    query: {
      enabled,
      refetchInterval: 12_000,
    },
  });

  const bounty: CRBounty | undefined = query.data
    ? parseCRBounty(query.data as any)
    : undefined;

  return {
    bounty,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
