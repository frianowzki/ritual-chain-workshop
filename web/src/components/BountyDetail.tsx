"use client";

import type { Bounty } from "@/lib/bounty";
import { getBountyStatus, STATUS_META } from "@/lib/bounty";
import { useNow } from "@/hooks/useNow";
import { shortenAddress, formatReward, formatTimestamp, formatRelative } from "@/lib/format";
import { Card, CardHeader, CardBody, Badge, Stat } from "@/components/ui";

export function BountyDetail({
  bountyId,
  bounty,
  isOwner,
}: {
  bountyId: bigint;
  bounty: Bounty;
  isOwner: boolean;
}) {
  const now = useNow();
  const status = getBountyStatus(bounty, now);
  const meta = STATUS_META[status];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-zinc-500">#{bountyId.toString()}</span>
            <span className="normal-case text-base text-zinc-100">
              {bounty.title || "Untitled"}
            </span>
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            {isOwner && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-glow)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--accent-light)] ring-1 ring-[var(--accent)]/30 glow-accent animate-pulse" style={{ animationDuration: "3s" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Owner
              </span>
            )}
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        }
      />
      <CardBody className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Rubric</div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">
            {bounty.rubric || "-"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Stat label="Reward" value={formatReward(bounty.reward)} />
          <Stat label="Submissions" value={bounty.submissionCount.toString()} />
          <Stat
            label="Commit deadline"
            value={
              <span>
                {formatTimestamp(bounty.commitDeadline)}
                <span className="ml-1 text-xs text-zinc-500">
                  ({formatRelative(bounty.commitDeadline)})
                </span>
              </span>
            }
          />
          <Stat
            label="Reveal deadline"
            value={
              <span>
                {formatTimestamp(bounty.revealDeadline)}
                <span className="ml-1 text-xs text-zinc-500">
                  ({formatRelative(bounty.revealDeadline)})
                </span>
              </span>
            }
          />
          <Stat label="Owner" value={shortenAddress(bounty.owner)} />
        </div>

        {bounty.finalized && (
          <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
            Finalized, winner is submission{" "}
            <span className="font-mono font-semibold">#{bounty.winnerIndex.toString()}</span>.
          </div>
        )}
      </CardBody>
    </Card>
  );
}
