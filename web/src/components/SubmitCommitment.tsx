"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useNow } from "@/hooks/useNow";
import { keccak256, toBytes, toHex, pad } from "viem";
import commitRevealAbi from "@/abi/CommitRevealBounty";
import { crContractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { canCommit, type CRBounty } from "@/lib/bounty";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Card, CardHeader, CardBody, Field, Textarea, Input, Button, TxStatus,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function SubmitCommitment({
  bountyId,
  bounty,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: CRBounty;
  onSubmitted: () => void;
}) {
  const { isConnected, address } = useAccount();
  const [answer, setAnswer] = useState("");
  const [salt, setSalt] = useState("");
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);
  const now = useNow();
  const tx = useWriteTx(() => {
    setAnswer("");
    setSalt("");
    setCommitment(null);
    onSubmitted();
  });

  if (!canCommit(bounty, now / 1000)) return null;

  // Compute commitment hash when answer or salt changes
  function computeHash(a: string, s: string): `0x${string}` | null {
    if (!a.trim() || !s.trim() || !address) return null;
    const saltBytes = pad(toBytes(s), { size: 32 });
    const answerHex = toHex(toBytes(a)).slice(2);
    const saltHex = saltBytes.slice(2);
    const addrHex = address.slice(2).toLowerCase();
    const idHex = bountyId.toString(16).padStart(64, "0");
    return keccak256(`0x${answerHex}${saltHex}${addrHex}${idHex}` as `0x${string}`);
  }

  // Recompute on change
  const hash = computeHash(answer, salt);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hash || !crContractAddress) return;
    try {
      await tx.run({
        address: crContractAddress,
        abi: commitRevealAbi,
        functionName: "submitCommitment",
        args: [bountyId, hash],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Submit commitment"
        subtitle="Your answer stays hidden until the reveal phase. Save your answer and salt!"
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Your answer" hint="Keep this secret until reveal.">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Write your answer..."
            />
          </Field>
          <Field label="Salt" hint="Random string. You'll need this to reveal.">
            <Input
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="e.g. my-secret-salt-abc123"
            />
          </Field>

          {hash && (
            <div className="rounded-lg bg-zinc-900 p-3 text-xs">
              <p className="text-zinc-500 mb-1">Commitment hash (what gets stored on-chain):</p>
              <p className="font-mono text-zinc-300 break-all">{hash}</p>
            </div>
          )}

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200">
            <strong>Important:</strong> Save your answer and salt! You need them to reveal later.
            If you lose either, you cannot reveal and your commitment is forfeit.
          </div>

          <Button
            type="submit"
            disabled={!isConnected || !hash || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Committing..." : "Submit commitment"}
          </Button>

          {!isConnected && (
            <p className="text-xs text-zinc-500">Connect your wallet to commit.</p>
          )}

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      </CardBody>
    </Card>
  );
}
