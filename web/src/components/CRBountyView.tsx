"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useCRBounty } from "@/hooks/useCRBounty";
import { isAddressEqual } from "@/lib/format";
import { getCRBountyStatus, CR_STATUS_META, type CRBounty } from "@/lib/bounty";
import { decodeAiReview } from "@/lib/aiReview";
import { SubmitCommitment } from "@/components/SubmitCommitment";
import { RevealAnswer } from "@/components/RevealAnswer";
import { JudgeAll } from "@/components/JudgeAll";
import { FinalizeWinner } from "@/components/FinalizeWinner";
import { AIReviewDisplay } from "@/components/AIReviewDisplay";
import { Card, CardBody, Notice, Spinner, Badge } from "@/components/ui";

export function CRBountyView({ bountyId }: { bountyId: bigint }) {
  const { address } = useAccount();
  const { bounty, isLoading, isError, refetch } = useCRBounty(bountyId);

  const reload = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Spinner /> Loading bounty #{bountyId.toString()}...
          </div>
        </CardBody>
      </Card>
    );
  }

  if (isError || !bounty) {
    return (
      <Notice tone="red">
        Couldn&apos;t load bounty #{bountyId.toString()}. Check the id and that the contract address / RPC are configured.
      </Notice>
    );
  }

  if (/^0x0+$/.test(bounty.owner)) {
    return <Notice tone="amber">Bounty #{bountyId.toString()} doesn&apos;t exist.</Notice>;
  }

  const isOwner = isAddressEqual(address, bounty.owner);
  const status = getCRBountyStatus(bounty);
  const meta = CR_STATUS_META[status];
  const judge = decodeAiReview(bounty.aiReview)?.parsed ?? null;

  // Adapt CRBounty to the shape JudgeAll/FinalizeWinner expect
  const adaptedBounty = {
    owner: bounty.owner,
    title: bounty.title,
    rubric: bounty.rubric,
    reward: bounty.reward,
    deadline: bounty.revealDeadline,
    judged: bounty.phase >= 2,
    finalized: bounty.phase === 3,
    submissionCount: bounty.commitmentCount,
    winnerIndex: bounty.winnerIndex,
    aiReview: bounty.aiReview,
  };

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-xs text-zinc-500">
          {bounty.commitmentCount.toString()} commitment(s) submitted
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left column: actions */}
        <div className="space-y-4">
          {/* Bounty details */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">{bounty.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{bounty.rubric}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500">Reward</span>
                  <p className="font-mono">{Number(bounty.reward) / 1e18} RITUAL</p>
                </div>
                <div>
                  <span className="text-zinc-500">Phase</span>
                  <p>{meta.label}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Commit deadline</span>
                  <p className="font-mono">{new Date(Number(bounty.commitDeadline) * 1000).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Reveal deadline</span>
                  <p className="font-mono">{new Date(Number(bounty.revealDeadline) * 1000).toLocaleString()}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <SubmitCommitment bountyId={bountyId} bounty={bounty} onSubmitted={reload} />
          <RevealAnswer bountyId={bountyId} bounty={bounty} onRevealed={reload} />

          {/* Reuse JudgeAll + FinalizeWinner with adapted bounty shape */}
          <JudgeAll bountyId={bountyId} bounty={adaptedBounty} isOwner={isOwner} onJudged={reload} />
          <FinalizeWinner bountyId={bountyId} bounty={adaptedBounty} isOwner={isOwner} onFinalized={reload} />
        </div>

        {/* Right column: AI review */}
        <div className="space-y-4">
          {bounty.phase >= 2 && <AIReviewDisplay aiReview={bounty.aiReview} />}
        </div>
      </div>
    </div>
  );
}
