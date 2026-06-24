# Privacy-Preserving AI Bounty Judge

Ritual Chain workshop — commit-reveal bounty system with AI judging via Ritual LLM precompile.

## Lifecycle

```
Owner creates bounty (commit + reveal deadlines, reward locked)
        │
        ▼
┌─────────────────────────────┐
│  COMMIT PHASE               │
│  Participants submit        │
│  keccak256 hash only.       │
│  Answers stay HIDDEN.       │
│  deadline: commitDeadline   │
└──────────────┬──────────────┘
               │
        ▼ after commitDeadline
┌─────────────────────────────┐
│  REVEAL PHASE               │
│  Participants reveal        │
│  answer + salt.             │
│  Contract verifies hash.    │
│  deadline: revealDeadline   │
└──────────────┬──────────────┘
               │
        ▼ owner triggers judgeAll
┌─────────────────────────────┐
│  AI JUDGING                 │
│  Ritual LLM precompile      │
│  ranks revealed answers.    │
│  Result is advisory.        │
└──────────────┬──────────────┘
               │
        ▼ owner picks winner
┌─────────────────────────────┐
│  FINALIZED                  │
│  Winner receives reward.    │
│  One payout, one winner.    │
└─────────────────────────────┘
```

## Architecture

**Contract:** `AIJudge.sol` — single contract, commit-reveal + Ritual LLM precompile

**Key functions:**
- `createBounty(title, rubric, commitDeadline, revealDeadline)` — creates bounty, locks reward
- `submitCommitment(bountyId, commitment)` — submit hash during commit phase
- `revealAnswer(bountyId, answer, salt)` — reveal after commit deadline
- `judgeAll(bountyId, llmInput)` — owner triggers Ritual LLM on revealed answers
- `finalizeWinner(bountyId, winnerIndex)` — owner pays winner
- `computeCommitment(answer, salt, sender, bountyId)` — off-chain helper

**Commitment scheme:**
```
commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
```
Binds answer + salt + sender + bounty ID. Prevents copying and frontrunning.

## Security Properties

- Answers hidden until reveal phase (on-chain only stores hash)
- Commitment binds: answer + salt + sender + bountyId
- Same address cannot commit twice
- Winner must have revealed their answer
- Reentrancy safe: reward zeroed before transfer
- Phase enforcement: each function checks correct timing

## Test Plan

| Test | Expected |
|------|----------|
| Create bounty with dual deadlines | ✅ |
| Reject reveal deadline <= commit deadline | ✅ |
| Submit commitment stores hash | ✅ |
| Reject duplicate commit from same address | ✅ |
| Reveal with correct answer + salt | ✅ |
| Reject reveal with wrong salt | hash mismatch |
| Reject reveal with wrong answer | hash mismatch |
| Reject double reveal | already revealed |
| Reject reveal before commit deadline | commit phase still active |
| computeCommitment helper matches on-chain | ✅ |

## Quick Start

```bash
# Compile
cd hardhat && npx hardhat compile

# Test
npx hardhat test test/AIJudge.test.ts

# Deploy (set PRIVATE_KEY in .env first)
npx hardhat ignition deploy ignition/modules/AIJudge.ts --network ritual
```

## Frontend

```bash
cd web
cp .env.example .env.local  # set NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
```
