"use client";

import { useState } from "react";
import { keccak256, toBytes, encodePacked } from "viem";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import aiJudgeAbi from "@/abi/AIJudge";
import { useWriteTx } from "@/hooks/useWriteTx";
import { canCommit, type Bounty } from "@/lib/bounty";
import {
  Card, CardHeader, CardBody, Field, Input, Textarea, Button, TxStatus,
} from "@/components/ui";

const explorerBase = ritualChain.blockExplorers?.default.url;

export function SubmitCommitment({
  bountyId,
  bounty,
  address,
  onSubmitted,
}: {
  bountyId: bigint;
  bounty: Bounty;
  address?: `0x${string}`;
  onSubmitted: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [salt, setSalt] = useState("");
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);

  const tx = useWriteTx(() => {
    setAnswer("");
    setSalt("");
    setCommitment(null);
    onSubmitted();
  });

  if (!canCommit(bounty)) return null;

  function computeHash() {
    if (!answer || !address) return;
    const saltBytes = salt
      ? toBytes(salt, { size: 32 })
      : keccak256(toBytes(Date.now().toString()));
    const saltHex = keccak256(saltBytes);
    const hash = keccak256(
      encodePacked(
        ["string", "bytes32", "address", "uint256"],
        [answer, saltHex, address, bountyId]
      )
    );
    setCommitment(hash);
    return { hash, saltHex };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractAddress || !address) return;

    const result = computeHash();
    if (!result) return;

    try {
      await tx.run({
        address: contractAddress,
        abi: aiJudgeAbi,
        functionName: "submitCommitment",
        args: [bountyId, result.hash],
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
        subtitle="Your answer stays hidden until the reveal phase. Save your answer + secret code!"
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Your answer" hint="Keep this secret until reveal.">
            <Textarea
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setCommitment(null); }}
              rows={4}
              placeholder="Your answer to the bounty…"
              maxLength={2000}
            />
          </Field>
          <Field label="Secret Code" hint="Random string. You'll need this to reveal.">
            <Input
              value={salt}
              onChange={(e) => { setSalt(e.target.value); setCommitment(null); }}
              placeholder="my-secret-code-123"
            />
          </Field>

          {commitment && (
            <div className="rounded-lg bg-white/5 p-2 text-xs font-mono break-all">
              <span className="text-zinc-500">Hash: </span>{commitment}
            </div>
          )}

          <Button
            type="submit"
            disabled={!answer || tx.isBusy}
            className="w-full"
          >
            {tx.isBusy ? "Submitting…" : "Submit commitment"}
          </Button>

          <TxStatus state={tx.state} error={tx.error} hash={tx.hash} explorerBase={explorerBase} />
        </form>
      </CardBody>
    </Card>
  );
}
