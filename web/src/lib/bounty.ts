import type { Address } from "viem";

/** Parsed shape of the `getBounty` tuple return value. */
export type Bounty = {
  owner: Address;
  title: string;
  rubric: string;
  reward: bigint;
  commitDeadline: bigint;
  revealDeadline: bigint;
  judged: boolean;
  finalized: boolean;
  submissionCount: bigint;
  winnerIndex: bigint;
  aiReview: `0x${string}`;
};

/** getBounty returns a positional tuple — map it to a named object. */
export function parseBounty(
  raw: readonly [
    Address,
    string,
    string,
    bigint,
    bigint,
    bigint,
    boolean,
    boolean,
    bigint,
    bigint,
    `0x${string}`,
  ],
): Bounty {
  const [
    owner,
    title,
    rubric,
    reward,
    commitDeadline,
    revealDeadline,
    judged,
    finalized,
    submissionCount,
    winnerIndex,
    aiReview,
  ] = raw;
  return {
    owner,
    title,
    rubric,
    reward,
    commitDeadline,
    revealDeadline,
    judged,
    finalized,
    submissionCount,
    winnerIndex,
    aiReview,
  };
}

export type BountyStatus = "commit" | "reveal" | "judged" | "finalized";

export function getBountyStatus(b: Bounty, nowSeconds = Date.now() / 1000): BountyStatus {
  if (b.finalized) return "finalized";
  if (b.judged) return "judged";
  const now = BigInt(Math.floor(nowSeconds));
  if (now <= b.commitDeadline) return "commit";
  return "reveal";
}

export const STATUS_META: Record<
  BountyStatus,
  { label: string; tone: "green" | "amber" | "indigo" | "zinc" }
> = {
  commit: { label: "Committing", tone: "green" },
  reveal: { label: "Revealing", tone: "amber" },
  judged: { label: "Judged", tone: "indigo" },
  finalized: { label: "Finalized", tone: "zinc" },
};

/** Can a participant still submit a commitment? */
export function canCommit(b: Bounty, nowSeconds = Date.now() / 1000): boolean {
  const now = BigInt(Math.floor(nowSeconds));
  return !b.judged && !b.finalized && now <= b.commitDeadline;
}

/** Can a participant reveal their answer? */
export function canReveal(b: Bounty, nowSeconds = Date.now() / 1000): boolean {
  const now = BigInt(Math.floor(nowSeconds));
  return !b.judged && !b.finalized && now <= b.revealDeadline;
}
