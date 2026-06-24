"use client";

import { useState } from "react";
import { keccak256, toBytes, encodePacked } from "viem";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { useWriteTx } from "@/hooks/useWriteTx";
import { canReveal, type Bounty } from "@/lib/bounty";
import {
  Card, CardHeader, CardBody, Field, Input, Textarea, Button, TxStatus,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function RevealAnswer({
  bountyId,
  bounty,
  address,
  onRevealed,
}: {
  bountyId: bigint;
  bounty: Bounty;
  address?: `0x${string}`;
  onRevealed: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [salt, setSalt] = useState("");

  const tx = useWriteTx(() => {
    setAnswer("");
    setSalt("");
    onRevealed();
  });

  if (!canReveal(bounty)) return null;

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!contractAddress || !answer || !salt) return;

    // Derive the salt hex the same way SubmitCommitment does
    const saltBytes = toBytes(salt, { size: 32 });
    const saltHex = keccak256(saltBytes);

    try {
      await tx.run({
        address: contractAddress,
        abi: aiJudgeAbi,
        functionName: "revealAnswer",
        args: [bountyId, answer, saltHex],
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
        subtitle="Use the same answer and secret code you committed."
      />
      <CardBody>
        <form onSubmit={handleReveal} className="space-y-3">
          <Field label="Your answer" hint="Must match the commitment exactly.">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="The same answer you committed…"
              maxLength={2000}
            />
          </Field>
          <Field label="Secret Code" hint="The same secret code used during commitment.">
            <Input
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="my-secret-code-123"
            />
          </Field>

          <Button
            type="submit"
            disabled={!answer || !salt || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Revealing…" : "Reveal answer"}
          </Button>

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      </CardBody>
    </Card>
  );
}
