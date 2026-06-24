"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useNow } from "@/hooks/useNow";
import commitRevealAbi from "@/abi/CommitRevealBounty";
import { crContractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { canReveal, type CRBounty } from "@/lib/bounty";
import { useWriteTx } from "@/hooks/useWriteTx";
import {
  Card, CardHeader, CardBody, Field, Textarea, Input, Button, TxStatus,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function RevealAnswer({
  bountyId,
  bounty,
  onRevealed,
}: {
  bountyId: bigint;
  bounty: CRBounty;
  onRevealed: () => void;
}) {
  const { isConnected } = useAccount();
  const [answer, setAnswer] = useState("");
  const [salt, setSalt] = useState("");
  const now = useNow();
  const tx = useWriteTx(() => {
    setAnswer("");
    setSalt("");
    onRevealed();
  });

  if (!canReveal(bounty, now / 1000)) return null;

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !salt.trim() || !crContractAddress) return;
    try {
      // Pad salt to 32 bytes to match commitment
      const { pad: padBytes, toBytes: strToBytes } = await import("viem");
      const saltPadded = `0x${Buffer.from(padBytes(strToBytes(salt), { size: 32 })).toString("hex")}` as `0x${string}`;
      await tx.run({
        address: crContractAddress,
        abi: commitRevealAbi,
        functionName: "revealAnswer",
        args: [bountyId, answer.trim(), saltPadded],
        chainId: ritualChain.id,
      });
    } catch {
      /* surfaced via tx.state */
    }
  }

  return (
    <Card>
      <CardHeader
        title="Reveal your answer"
        subtitle="Commit phase is over. Prove what you committed by revealing your answer and salt."
      />
      <CardBody>
        <form onSubmit={handleReveal} className="space-y-3">
          <Field label="Your answer" hint="Must match exactly what you committed.">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="The same answer you committed..."
            />
          </Field>
          <Field label="Salt" hint="The same salt you used during commitment.">
            <Input
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="e.g. my-secret-salt-abc123"
            />
          </Field>

          <div className="rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">
            The contract will verify: <code className="text-zinc-300">keccak256(answer, salt, your_address, bounty_id)</code> matches your commitment.
          </div>

          <Button
            type="submit"
            disabled={!isConnected || !answer.trim() || !salt.trim() || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Revealing..." : "Reveal answer"}
          </Button>

          {!isConnected && (
            <p className="text-xs text-zinc-500">Connect your wallet to reveal.</p>
          )}

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      </CardBody>
    </Card>
  );
}
