"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import { contractAddress, isContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Card,
  CardHeader,
  CardBody,
  Field,
  Input,
  Textarea,
  Button,
  TxStatus,
  Notice,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

function defaultDatetime(offsetHours: number): string {
  const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local value as local time (never UTC). */
function parseLocalDatetime(value: string): number {
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

export function CreateBountyForm({ onCreated }: { onCreated?: (bountyId: bigint) => void }) {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [rubric, setRubric] = useState("");
  const [commitDeadline, setCommitDeadline] = useState(defaultDatetime(1));
  const [revealDeadline, setRevealDeadline] = useState(defaultDatetime(2));
  const [reward, setReward] = useState("");
  const [createdId, setCreatedId] = useState<bigint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const tx = useWriteTx((receipt) => {
    try {
      const logs = parseEventLogs({
        abi: aiJudgeAbi,
        eventName: "BountyCreated",
        logs: receipt.logs,
      });
      const id = logs[0]?.args?.bountyId;
      if (id !== undefined) {
        setCreatedId(id);
        onCreated?.(id);
      }
    } catch {
      /* couldn't decode — not fatal */
    }
  });

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!rubric.trim()) return "Rubric is required.";
    if (!commitDeadline) return "Pick a commit deadline.";
    if (!revealDeadline) return "Pick a reveal deadline.";
    const commitMs = parseLocalDatetime(commitDeadline);
    const revealMs = parseLocalDatetime(revealDeadline);
    if (!Number.isFinite(commitMs) || !Number.isFinite(revealMs)) return "Invalid deadline.";
    // Compare in ms — chain uses ms timestamps
    if (commitMs <= Date.now()) return "Commit deadline must be in the future.";
    if (revealMs <= commitMs) return "Reveal deadline must be after commit deadline.";
    if (reward !== "") {
      try { parseEther(reward); } catch { return "Reward must be a valid number."; }
    }
    return null;
  }

  // Re-validate on every render (Date.now() stays fresh)
  const validation = validate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Re-validate at submit time (fresh Date.now())
    const err = validate();
    if (err || !contractAddress) {
      if (err) setFormError(err);
      return;
    }

    const commitMs = parseLocalDatetime(commitDeadline);
    const revealMs = parseLocalDatetime(revealDeadline);
    // Contract uses raw block.timestamp (ms on Ritual Chain) — send ms, not seconds
    const commitTs = BigInt(commitMs);
    const revealTs = BigInt(revealMs);
    const value = reward.trim() === "" ? 0n : parseEther(reward.trim());
    setCreatedId(null);

    console.log("Creating bounty:", {
      title: title.trim(),
      commitTs: commitTs.toString(),
      revealTs: revealTs.toString(),
      now: Date.now(),
      commitInFuture: commitTs > BigInt(Date.now()),
    });

    try {
      await tx.run({
        address: contractAddress,
        abi: aiJudgeAbi,
        functionName: "createBounty",
        args: [title.trim(), rubric.trim(), commitTs, revealTs],
        value,
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Create a bounty"
        subtitle="Fund a reward. Answers stay hidden until the reveal phase."
      />
      <CardBody>
        {!isContractConfigured && (
          <Notice tone="amber">
            Set <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in your{" "}
            <code className="font-mono">.env.local</code> to enable transactions.
          </Notice>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Best gas-optimization writeup"
              maxLength={200}
            />
          </Field>

          <Field label="Rubric" hint="How submissions are scored. The AI judges only against this.">
            <Textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={4}
              placeholder="Correctness 50%, clarity 30%, novelty 20%…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Commit deadline" hint="After this, no new commitments.">
              <Input
                type="datetime-local"
                value={commitDeadline}
                onChange={(e) => setCommitDeadline(e.target.value)}
              />
            </Field>
            <Field label="Reveal deadline" hint="After this, no new reveals.">
              <Input
                type="datetime-local"
                value={revealDeadline}
                onChange={(e) => setRevealDeadline(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Reward (RITUAL)" hint="Locked in the contract on create.">
            <Input
              type="number"
              min="0"
              step="any"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="1.0"
            />
          </Field>

          {(formError || (validation && (title || rubric || reward))) ? (
            <p className="text-xs text-amber-300">{formError ?? validation}</p>
          ) : null}

          <Button
            type="submit"
            disabled={!isConnected || !isContractConfigured || !!validation || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Creating…" : "Create bounty"}
          </Button>

          {!isConnected && (
            <p className="text-xs text-zinc-500">Connect your wallet to create a bounty.</p>
          )}

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />

          {createdId !== null && (
            <Notice tone="green">
              Bounty created with id{" "}
              <span className="font-mono font-semibold">#{createdId.toString()}</span>. Loaded
              below.
            </Notice>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
