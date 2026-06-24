"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import commitRevealAbi from "@/abi/CommitRevealBounty";
import { crContractAddress, executorAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useCRBounty } from "@/hooks/useCRBounty";
import { isAddressEqual } from "@/lib/format";
import { getCRBountyStatus, CR_STATUS_META } from "@/lib/bounty";
import { decodeAiReview } from "@/lib/aiReview";
import { buildJudgeAllLlmInput, type JudgeSubmission } from "@/lib/ritualLlm";
import { useWriteTx } from "@/hooks/useWriteTx";
import { useRitualWalletStatus } from "@/hooks/useRitualWalletStatus";
import { SubmitCommitment } from "@/components/SubmitCommitment";
import { RevealAnswer } from "@/components/RevealAnswer";
import { AIReviewDisplay } from "@/components/AIReviewDisplay";
import {
  Card, CardHeader, CardBody, Field, Input, Button, TxStatus,
  Notice, Spinner, Badge,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

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
        <div className="space-y-4">
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
          <JudgeSection bountyId={bountyId} bounty={bounty} isOwner={isOwner} onJudged={reload} />
          <FinalizeSection bountyId={bountyId} bounty={bounty} isOwner={isOwner} onFinalized={reload} />
        </div>

        <div className="space-y-4">
          {bounty.phase >= 2 && <AIReviewDisplay aiReview={bounty.aiReview} />}
        </div>
      </div>
    </div>
  );
}

/* ── Judge Section ──────────────────────────────────────────────── */

function JudgeSection({
  bountyId,
  bounty,
  isOwner,
  onJudged,
}: {
  bountyId: bigint;
  bounty: { phase: number; commitmentCount: bigint; title: string; rubric: string; owner: `0x${string}` };
  isOwner: boolean;
  onJudged: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: ritualChain.id });
  const [gathering, setGathering] = useState(false);
  const [gatherError, setGatherError] = useState<string | null>(null);
  const tx = useWriteTx(() => onJudged());
  const walletStatus = useRitualWalletStatus(address);

  const count = Number(bounty.commitmentCount);

  if (!isOwner || bounty.phase >= 2 || count === 0) return null;

  async function handleJudge() {
    if (!publicClient || !crContractAddress || !walletStatus.ready) return;
    setGatherError(null);
    setGathering(true);
    try {
      // Load all commitments and filter revealed ones
      const submissions: JudgeSubmission[] = [];
      for (let i = 0; i < count; i++) {
        const [submitter, , revealed, answer] = await publicClient.readContract({
          address: crContractAddress,
          abi: commitRevealAbi,
          functionName: "getCommitment",
          args: [bountyId, BigInt(i)],
        });
        if (revealed) {
          submissions.push({ index: submissions.length, submitter, answer });
        }
      }

      if (submissions.length === 0) {
        setGatherError("No revealed answers to judge.");
        setGathering(false);
        return;
      }

      const llmInput = buildJudgeAllLlmInput({
        executorAddress,
        title: bounty.title,
        rubric: bounty.rubric,
        submissions,
      });

      setGathering(false);

      await tx.run({
        address: crContractAddress,
        abi: commitRevealAbi,
        functionName: "judgeAll",
        args: [bountyId, llmInput],
        chainId: ritualChain.id,
      });
    } catch (e) {
      setGathering(false);
      setGatherError(
        (e as { shortMessage?: string; message?: string }).shortMessage ||
          (e as Error).message ||
          "Failed to gather submissions."
      );
    }
  }

  const busy = gathering || tx.isBusy;
  const fundingReady = walletStatus.ready === true;

  return (
    <Card>
      <CardHeader
        title="Judge all submissions"
        subtitle="Sends one Ritual LLM request ranking every revealed answer."
      />
      <CardBody className="space-y-3">
        <Notice tone="indigo">AI review is advisory. The bounty owner finalizes the winner.</Notice>

        {!fundingReady && (
          <Notice tone="amber">
            Fund your RitualWallet with RITUAL and lock it to cover LLM gas before judging.
          </Notice>
        )}

        <Button onClick={handleJudge} disabled={busy || !fundingReady} className="w-full">
          {gathering ? (
            <><Spinner /> Gathering {count} commitments…</>
          ) : tx.isBusy ? (
            "Judging…"
          ) : !fundingReady ? (
            "Fund RitualWallet to judge"
          ) : (
            `Judge all (${count})`
          )}
        </Button>
        {gatherError && <Notice tone="red">{gatherError}</Notice>}
        <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
      </CardBody>
    </Card>
  );
}

/* ── Finalize Section ───────────────────────────────────────────── */

function FinalizeSection({
  bountyId,
  bounty,
  isOwner,
  onFinalized,
}: {
  bountyId: bigint;
  bounty: { phase: number; commitmentCount: bigint; winnerIndex: bigint; aiReview: `0x${string}` };
  isOwner: boolean;
  onFinalized: () => void;
}) {
  const count = Number(bounty.commitmentCount);
  const recommended = decodeAiReview(bounty.aiReview)?.parsed?.winnerIndex;

  const [override, setOverride] = useState<string | null>(null);
  const winnerIndex =
    override ?? (recommended !== undefined ? String(recommended) : "");

  const tx = useWriteTx(() => onFinalized());

  if (!isOwner || bounty.phase !== 2) return null;

  const idxNum = Number(winnerIndex);
  const valid =
    winnerIndex !== "" &&
    Number.isInteger(idxNum) &&
    idxNum >= 0 &&
    idxNum < count;

  async function handleFinalize() {
    if (!valid || !crContractAddress) return;
    try {
      await tx.run({
        address: crContractAddress,
        abi: commitRevealAbi,
        functionName: "finalizeWinner",
        args: [bountyId, BigInt(idxNum)],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Finalize winner"
        subtitle="Pays the reward to the chosen submission. Only one winner."
      />
      <CardBody className="space-y-3">
        <Notice tone="zinc">
          Only one winner receives the bounty reward.
        </Notice>

        <Field
          label="Winner index"
          hint={
            recommended !== undefined
              ? `AI recommends #${recommended}. You decide the final winner.`
              : `Choose a submission index (0–${Math.max(count - 1, 0)}).`
          }
        >
          <Input
            type="number"
            min={0}
            max={Math.max(count - 1, 0)}
            value={winnerIndex}
            onChange={(e) => setOverride(e.target.value)}
          />
        </Field>

        {winnerIndex !== "" && !valid && (
          <p className="text-xs text-amber-300">
            Index must be between 0 and {Math.max(count - 1, 0)}.
          </p>
        )}

        <Button
          onClick={handleFinalize}
          disabled={!valid || tx.isBusy}
          className="w-full"
        >
          {tx.isBusy ? "Finalizing…" : "Finalize winner"}
        </Button>

        <TxStatus
          state={tx.state}
          error={tx.error}
          hash={tx.hash}
          explorerBase={explorerBase}
        />
      </CardBody>
    </Card>
  );
}
