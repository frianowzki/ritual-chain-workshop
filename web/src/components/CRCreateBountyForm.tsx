"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import commitRevealAbi from "@/abi/CommitRevealBounty";
import { crContractAddress, isCRContractConfigured } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Card, CardHeader, CardBody, Field, Input, Textarea, Button, TxStatus, Notice,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

function defaultDeadline(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CRCreateBountyForm({ onCreated }: { onCreated?: (bountyId: bigint) => void }) {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [rubric, setRubric] = useState("");
  const [commitDeadline, setCommitDeadline] = useState(defaultDeadline(1));
  const [revealDeadline, setRevealDeadline] = useState(defaultDeadline(2));
  const [reward, setReward] = useState("");
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  const tx = useWriteTx((receipt) => {
    try {
      const logs = parseEventLogs({
        abi: commitRevealAbi,
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

  const validation = useMemo(() => {
    if (!title.trim()) return "Title is required.";
    if (!rubric.trim()) return "Rubric is required.";
    if (!commitDeadline) return "Pick a commit deadline.";
    if (!revealDeadline) return "Pick a reveal deadline.";
    const commitTs = new Date(commitDeadline).getTime();
    const revealTs = new Date(revealDeadline).getTime();
    if (!Number.isFinite(commitTs)) return "Invalid commit deadline.";
    if (!Number.isFinite(revealTs)) return "Invalid reveal deadline.";
    if (revealTs <= commitTs) return "Reveal deadline must be after commit deadline.";
    if (reward !== "") {
      try { parseEther(reward); } catch { return "Reward must be a valid number."; }
    }
    return null;
  }, [title, rubric, commitDeadline, revealDeadline, reward]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validation || !crContractAddress) return;

    const commitTs = Math.floor(new Date(commitDeadline).getTime() / 1000);
    const revealTs = Math.floor(new Date(revealDeadline).getTime() / 1000);
    const value = reward.trim() === "" ? 0n : parseEther(reward.trim());
    setCreatedId(null);

    try {
      await tx.run({
        address: crContractAddress,
        abi: commitRevealAbi,
        functionName: "createBounty",
        args: [title.trim(), rubric.trim(), BigInt(commitTs), BigInt(revealTs)],
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
        title="Create commit-reveal bounty"
        subtitle="Two-phase: participants commit hashes first, then reveal after the deadline."
      />
      <CardBody>
        {!isCRContractConfigured && (
          <Notice tone="amber">
            Set <code className="font-mono">NEXT_PUBLIC_CR_CONTRACT_ADDRESS</code> in{" "}
            <code className="font-mono">.env.local</code> to enable.
          </Notice>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Best gas-optimization writeup" maxLength={200} />
          </Field>
          <Field label="Rubric" hint="How submissions are scored. The AI judges only against this.">
            <Textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={3} placeholder="Correctness 50%, clarity 30%, novelty 20%..." />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Commit deadline" hint="After this, no new commitments.">
              <Input type="datetime-local" value={commitDeadline} onChange={(e) => setCommitDeadline(e.target.value)} />
            </Field>
            <Field label="Reveal deadline" hint="After this, no more reveals.">
              <Input type="datetime-local" value={revealDeadline} onChange={(e) => setRevealDeadline(e.target.value)} />
            </Field>
          </div>

          <Field label="Reward (RITUAL)" hint="Locked in the contract on create.">
            <Input type="number" min="0" step="any" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="1.0" />
          </Field>

          {validation && (title || rubric || reward) ? (
            <p className="text-xs text-amber-300">{validation}</p>
          ) : null}

          <Button type="submit" disabled={!isConnected || !isCRContractConfigured || !!validation || tx.isBusy} className="w-full">
            {tx.isBusy ? "Creating..." : "Create bounty"}
          </Button>

          {!isConnected && <p className="text-xs text-zinc-500">Connect your wallet to create a bounty.</p>}

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />

          {createdId !== null && (
            <Notice tone="green">
              Bounty created with id <span className="font-mono font-semibold">#{createdId.toString()}</span>. Loaded below.
            </Notice>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
