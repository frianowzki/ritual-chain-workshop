# Privacy-Preserving AI Bounty Judge — Commit-Reveal

## Problem

In the original `AIJudge` contract, submissions were public on-chain. This allowed participants to copy others' ideas and submit improved versions — a critical fairness flaw.

## Solution: Commit-Reveal Scheme

Answers are hidden until the reveal phase. Participants submit only a cryptographic commitment (hash) during the submission phase. After the deadline, they reveal their answer and salt. The contract verifies the hash matches before accepting the reveal.

## Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: COMMIT                                                │
│                                                                  │
│  Owner: createBounty(title, rubric, commitDeadline, revealDL)    │
│         → funds locked in contract                               │
│                                                                  │
│  Participants: submitCommitment(bountyId, commitment)            │
│    where commitment = keccak256(answer, salt, sender, bountyId)  │
│    → only hash stored on-chain, answer stays secret              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: REVEAL  (after commitDeadline)                         │
│                                                                  │
│  Participants: revealAnswer(bountyId, answer, salt)              │
│    → contract verifies:                                          │
│      keccak256(answer, salt, msg.sender, bountyId) == hash       │
│    → only valid reveals marked as eligible                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: JUDGE  (after revealDeadline)                          │
│                                                                  │
│  Owner: judgeAll(bountyId, llmInput)                             │
│    → sends revealed answers to Ritual LLM precompile (0x0802)    │
│    → AI review stored on-chain                                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4: FINALIZE                                               │
│                                                                  │
│  Owner: finalizeWinner(bountyId, winnerIndex)                    │
│    → reward transferred to winner                                │
│    → bounty complete                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Properties

| Property | How |
|----------|-----|
| **Answer privacy** | Only commitment hash stored on-chain during commit phase |
| **Binding** | `keccak256(answer, salt, sender, bountyId)` — can't change answer after committing |
| **No frontrunning** | Hash includes `msg.sender` and `bountyId` — can't steal someone else's commitment |
| **No copying** | Answers hidden until reveal, by which time commit phase is closed |
| **Anti-replay** | Same address can't commit twice; can't reveal twice |

## Required Functions

```solidity
// Commit phase — submit hash only
function submitCommitment(uint256 bountyId, bytes32 commitment) external;

// Reveal phase — prove what you committed
function revealAnswer(uint256 bountyId, string calldata answer, bytes32 salt) external;

// Judge phase — AI reviews all revealed answers
function judgeAll(uint256 bountyId, bytes calldata llmInput) external;

// Finalize — pay the winner
function finalizeWinner(uint256 bountyId, uint256 winnerIndex) external;
```

## How to Generate a Commitment (Off-Chain)

```javascript
import { keccak256, toBytes, toHex, pad } from "viem";

const answer = "My brilliant answer";
const salt = toHex(pad(toBytes("my-secret-salt"), { size: 32 }));
const commitment = keccak256(
  toHex(toBytes(answer)).slice(2) +
  salt.slice(2) +
  senderAddress.slice(2).toLowerCase() +
  bountyId.toString(16).padStart(64, "0")
);
```

Or use the on-chain helper:
```solidity
bytes32 hash = bounty.computeCommitment(answer, salt, msg.sender, bountyId);
```

## Architecture Notes

### On-Chain vs Off-Chain

| Data | Where | When Visible |
|------|-------|-------------|
| Commitment hash | On-chain | Immediately |
| Answer plaintext | Off-chain (participant's local storage) | After reveal |
| Salt | Off-chain (participant's local storage) | After reveal |
| Revealed answers | On-chain | After reveal phase |
| AI review | On-chain | After judging |

### Plaintext Answer Lifecycle

1. **Commit phase:** Answer exists ONLY on participant's machine. Not transmitted to chain or network.
2. **Reveal phase:** Answer sent to chain as calldata. Visible to all. But commit phase is already closed — no new commitments accepted.
3. **Judging phase:** Owner includes revealed answers in LLM prompt. LLM processes them in TEE (Ritual precompile 0x0802).

### Advanced Track: Ritual-Native Hidden Submissions

For the advanced track, the architecture extends to keep answers encrypted even during judging:

```
Participant → ECIES-encrypt(answer, TEE_executor_pubkey) → on-chain
                                                            ↓
                                              TEE decrypts → LLM judges
                                                            ↓
                                              Only result on-chain (answer redacted via PII mode)
```

**Where plaintext exists:**
- Participant's machine (always)
- TEE enclave memory (during judging only — attested, not observable)

**What's on-chain:**
- Encrypted answer (ECIES ciphertext)
- Commitment hash
- AI review result (no plaintext answers)

**How LLM receives submissions:**
- All encrypted answers collected on-chain
- Single `judgeAll` call with PII-enabled LLM precompile
- TEE decrypts all answers, judges batch, returns only the review
- Answers never appear in plaintext on-chain or in mempool

This uses Ritual's native privacy primitives:
- `DKMS_PRECOMPILE (0x081B)` — derive TEE executor keys
- `LLM_INFERENCE_PRECOMPILE (0x0802)` — LLM with PII mode
- `piiEnabled = true` — redact inputs from settlement

## Test Plan

### Reveal Edge Cases

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Full lifecycle: commit → reveal → finalize | All phases advance correctly |
| 2 | Reveal with wrong salt | Revert: "hash mismatch" |
| 3 | Reveal with wrong answer | Revert: "hash mismatch" |
| 4 | Reveal from different address | Revert: "no commitment found" |
| 5 | Reveal before commit deadline | Revert: "commit phase still active" |
| 6 | Commit after commit deadline | Revert: "commit phase closed" |
| 7 | Reveal after reveal deadline | Revert: "reveal phase closed" |
| 8 | Double commit from same address | Revert: "already committed" |
| 9 | Double reveal | Revert: "already revealed" |
| 10 | Empty commitment hash | Revert: "empty commitment" |
| 11 | Empty answer on reveal | Revert: "empty answer" |
| 12 | Past commit deadline on create | Revert: "commit deadline must be future" |
| 13 | Reveal deadline before commit deadline | Revert: "reveal must be after commit" |
| 14 | Multiple participants commit + reveal | Both answers correctly stored |
| 15 | computeCommitment helper matches on-chain | Hash matches |

### Run Tests

```bash
cd hardhat
npx hardhat test test/CommitRevealBounty.ts
```

## Differences from Original AIJudge

| Aspect | Original AIJudge | CommitRevealBounty |
|--------|-----------------|-------------------|
| Submissions | Public plaintext | Hidden until reveal |
| Phases | None (open → judged) | Open → Reveal → Judged → Finalized |
| Copying risk | High | Eliminated |
| Deadlines | 1 (submission) | 2 (commit + reveal) |
| Hash verification | None | keccak256(answer, salt, sender, bountyId) |
