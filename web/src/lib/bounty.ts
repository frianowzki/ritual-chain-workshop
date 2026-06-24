import type { Address } from "viem";

/** Parsed shape of the `getBounty` tuple return value. */
export type Bounty = {
  owner: Address;
  title: string;
  rubric: string;
  reward: bigint;
  deadline: bigint;
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
    deadline,
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
    deadline,
    judged,
    finalized,
    submissionCount,
    winnerIndex,
    aiReview,
  };
}

export type BountyStatus = "open" | "ready" | "judged" | "finalized";

export function getBountyStatus(b: Bounty, nowSeconds = Date.now() / 1000): BountyStatus {
  if (b.finalized) return "finalized";
  if (b.judged) return "judged";
  const deadlinePassed = Number(b.deadline) <= nowSeconds;
  return deadlinePassed ? "ready" : "open";
}

export const STATUS_META: Record<
  BountyStatus,
  { label: string; tone: "green" | "amber" | "indigo" | "zinc" }
> = {
  open: { label: "Open", tone: "green" },
  ready: { label: "Ready for judging", tone: "amber" },
  judged: { label: "Judged", tone: "indigo" },
  finalized: { label: "Finalized", tone: "zinc" },
};

/** Can a participant still submit an answer? */
export function canSubmit(b: Bounty, nowSeconds = Date.now() / 1000): boolean {
  return !b.judged && !b.finalized && Number(b.deadline) > nowSeconds;
}

// ─── Commit-Reveal Bounty ─────────────────────────────────────────

export type CRPhase = 0 | 1 | 2 | 3; // Open, Reveal, Judged, Finalized

export type CRBounty = {
  owner: Address;
  title: string;
  rubric: string;
  reward: bigint;
  commitDeadline: bigint;
  revealDeadline: bigint;
  phase: CRPhase;
  commitmentCount: bigint;
  winnerIndex: bigint;
  aiReview: `0x${string}`;
};

export type CRCommitment = {
  submitter: Address;
  hash: `0x${string}`;
  revealed: boolean;
  answer: string;
};

/** getBounty returns a positional tuple — map it to a named object. */
export function parseCRBounty(
  raw: readonly [
    Address,    // owner
    string,     // title
    string,     // rubric
    bigint,     // reward
    bigint,     // commitDeadline
    bigint,     // revealDeadline
    number,     // phase
    bigint,     // commitmentCount
    bigint,     // winnerIndex
    `0x${string}`, // aiReview
  ],
): CRBounty {
  const [
    owner, title, rubric, reward,
    commitDeadline, revealDeadline, phase,
    commitmentCount, winnerIndex, aiReview,
  ] = raw;
  return {
    owner, title, rubric, reward,
    commitDeadline, revealDeadline,
    phase: phase as CRPhase,
    commitmentCount, winnerIndex, aiReview,
  };
}

export type CRBountyStatus = "commit" | "reveal" | "judged" | "finalized";

export function getCRBountyStatus(b: CRBounty, nowSeconds = Date.now() / 1000): CRBountyStatus {
  if (b.phase === 3) return "finalized";
  if (b.phase === 2) return "judged";
  if (b.phase === 1) return "reveal";
  return "commit";
}

export const CR_STATUS_META: Record<
  CRBountyStatus,
  { label: string; tone: "green" | "amber" | "indigo" | "zinc" }
> = {
  commit: { label: "Committing", tone: "green" },
  reveal: { label: "Revealing", tone: "amber" },
  judged: { label: "Judged", tone: "indigo" },
  finalized: { label: "Finalized", tone: "zinc" },
};

export function canCommit(b: CRBounty, nowSeconds = Date.now() / 1000): boolean {
  return b.phase === 0 && Number(b.commitDeadline) > nowSeconds;
}

export function canReveal(b: CRBounty, nowSeconds = Date.now() / 1000): boolean {
  return (b.phase === 0 || b.phase === 1) &&
    Number(b.commitDeadline) <= nowSeconds &&
    Number(b.revealDeadline) > nowSeconds;
}
