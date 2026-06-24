"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useBounty } from "@/hooks/useBounty";
import { isAddressEqual } from "@/lib/format";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { decodeAiReview } from "@/lib/aiReview";
import { BountyDetail } from "@/components/BountyDetail";
import { SubmitCommitment } from "@/components/SubmitCommitment";
import { RevealAnswer } from "@/components/RevealAnswer";
import { JudgeAll } from "@/components/JudgeAll";
import { FinalizeWinner } from "@/components/FinalizeWinner";
import { AIReviewDisplay } from "@/components/AIReviewDisplay";
import { Countdown } from "@/components/Countdown";
import { SubmissionsList } from "@/components/SubmissionsList";
import { Card, CardBody, Notice, Spinner, Badge } from "@/components/ui";

export function BountyView({ bountyId }: { bountyId: bigint }) {
  const { address } = useAccount();
  const { bounty, isLoading, isError, refetch } = useBounty(bountyId);

  const reload = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Spinner /> Loading bounty #{bountyId.toString()}…
          </div>
        </CardBody>
      </Card>
    );
  }

  if (isError || !bounty) {
    return (
      <Notice tone="red">
        Couldn&apos;t load bounty #{bountyId.toString()}. Check the id and that the
        contract address / RPC are configured correctly.
      </Notice>
    );
  }

  if (/^0x0+$/.test(bounty.owner)) {
    return (
      <Notice tone="amber">
        Bounty #{bountyId.toString()} doesn&apos;t exist.
      </Notice>
    );
  }

  const isOwner = isAddressEqual(address, bounty.owner);
  const status = getBountyStatus(bounty);
  const meta = STATUS_META[status];
  const judge = decodeAiReview(bounty.aiReview)?.parsed ?? null;

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-xs text-zinc-500">
          {bounty.submissionCount.toString()} commitment(s) submitted
        </span>
      </div>

      {/* Live countdown timers */}
      <div className="flex flex-wrap gap-4">
        <Countdown
          deadline={bounty.commitDeadline}
          label="Commit phase"
          tone={status === "commit" ? "green" : "zinc"}
        />
        <Countdown
          deadline={bounty.revealDeadline}
          label="Reveal phase"
          tone={status === "reveal" ? "amber" : "zinc"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <BountyDetail bountyId={bountyId} bounty={bounty} isOwner={isOwner} />
          <SubmitCommitment bountyId={bountyId} bounty={bounty} address={address} onSubmitted={reload} />
          <RevealAnswer bountyId={bountyId} bounty={bounty} address={address} onRevealed={reload} />
          <JudgeAll bountyId={bountyId} bounty={bounty} isOwner={isOwner} onJudged={reload} />
          <FinalizeWinner bountyId={bountyId} bounty={bounty} isOwner={isOwner} onFinalized={reload} />
        </div>

        <div className="space-y-4">
          {bounty.judged && <AIReviewDisplay aiReview={bounty.aiReview} />}
          <SubmissionsList
            bountyId={bountyId}
            count={Number(bounty.submissionCount)}
            judge={judge}
            finalWinner={bounty.finalized ? Number(bounty.winnerIndex) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
