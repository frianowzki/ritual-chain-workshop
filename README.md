<div align="center">

# 🔐 Privacy-Preserving AI Bounty Judge

**A commit-reveal bounty system with AI judging, built on [Ritual Chain](https://ritual.foundation)**

Solves the critical flaw in traditional bounty systems: **public submissions allow copying.**

![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat&logo=solidity)
![Ritual Chain](https://img.shields.io/badge/Ritual_Chain-1979-8B5CF6)
![Tests](https://img.shields.io/badge/Tests-10%2F10-22C55E)
![License](https://img.shields.io/badge/License-MIT-363636)

</div>

---

## The Problem

In a traditional bounty system, participants submit answers directly on-chain. This means:

- ❌ Everyone can see each other's answers
- ❌ Late submitters can copy and improve earlier answers
- ❌ First-mover disadvantage — your idea gets stolen

## The Solution: Commit-Reveal

Answers are **hidden** until all commitments are locked in. Two phases enforce fairness:

```
 Phase 1: COMMIT                    Phase 2: REVEAL
┌──────────────────────┐           ┌──────────────────────┐
│                      │           │                      │
│  Alice: 0x8a3f...    │           │  Alice: "Solidity"   │ ✓ verified
│  Bob:   0x1c7e...    │    ───►   │  Bob:   "Rust"       │ ✓ verified
│  Carol: 0x9b2d...    │           │  Carol: "Cairo"      │ ✓ verified
│                      │           │                      │
│  (only hashes on     │           │  (answers revealed,   │
│   chain — answers    │           │   hashes verified)    │
│   stay secret)       │           │                      │
└──────────────────────┘           └──────────────────────┘
     Before deadline                    After deadline
```

No one can copy because **all answers are committed before anyone reveals.**

---

## How It Works

### Step 1 — Owner Creates a Bounty

```solidity
createBounty(
    "Best L2 writeup",              // title
    "Clarity 40%, Depth 60%",       // rubric (used by AI judge)
    block.timestamp + 1 days,       // commitDeadline
    block.timestamp + 3 days        // revealDeadline
) { value: 5 ether }                // reward locked in contract
```

The owner sets two deadlines:
| Deadline | Purpose |
|---|---|
| `commitDeadline` | Last moment to submit a commitment hash |
| `revealDeadline` | Last moment to reveal your answer |

### Step 2 — Participants Commit (Hidden)

Off-chain, the participant computes a hash:

```javascript
import { keccak256, encodePacked } from 'viem';

const commitment = keccak256(
    encodePacked(
        ['string', 'bytes32', 'address', 'uint256'],
        [answer, salt, walletAddress, bountyId]
    )
);
```

On-chain, only the hash is stored:

```solidity
submitCommitment(bountyId, commitment);
// Answer is now locked. Nobody can see it. Nobody can change it.
```

**What the chain stores:** `0x8a3f7c2e...` (irreversible hash)
**What the chain does NOT store:** your actual answer

### Step 3 — Participants Reveal (After Commit Deadline)

Once the commit deadline passes, participants reveal:

```solidity
revealAnswer(bountyId, "Your actual answer here", salt);
```

The contract verifies:
```solidity
keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId)) == storedCommitment
```

If the hash matches → answer is published. If not → rejected.

### Step 4 — Owner Triggers AI Judging

```solidity
judgeAll(bountyId, llmInput);
```

This sends all revealed answers to the **Ritual LLM precompile** (address `0x0802`). The AI ranks submissions based on the owner's rubric. The result is advisory — the owner makes the final call.

### Step 5 — Owner Finalizes the Winner

```solidity
finalizeWinner(bountyId, 2); // submission #2 wins
```

The reward is transferred to the winner. One payout, one winner.

---

## Commitment Scheme

```
commitment = keccak256(answer ‖ salt ‖ sender ‖ bountyId)
```

| Component | Why it's included |
|---|---|
| `answer` | The actual submission content |
| `salt` | Prevents rainbow table attacks on the hash |
| `sender` | Binds commitment to a specific address (can't copy someone else's hash) |
| `bountyId` | Prevents replaying commitments across bounties |

**Properties:**
- **Hiding:** `keccak256` is one-way — you can't derive the answer from the hash
- **Binding:** Once committed, you can't change your answer (hash won't match)
- **Non-transferable:** Your hash is tied to your address — can't be claimed by others

---

## Security Properties

| Property | How |
|---|---|
| Answer privacy | Only hash stored on-chain until reveal |
| Anti-copy | All commits locked before any reveal |
| Anti-frontrunning | Commitment binds sender + bountyId |
| No duplicate commits | Same address can't commit twice |
| Winner must reveal | `finalizeWinner` checks `revealed == true` |
| Reentrancy safe | Reward zeroed before `call{value}` |
| Phase enforcement | Each function validates timing constraints |

---

## Contract Interface

```solidity
// Create
function createBounty(string title, string rubric, uint256 commitDeadline, uint256 revealDeadline) external payable;

// Commit-Reveal
function submitCommitment(uint256 bountyId, bytes32 commitment) external;
function revealAnswer(uint256 bountyId, string answer, bytes32 salt) external;

// Judge & Finalize
function judgeAll(uint256 bountyId, bytes llmInput) external;       // owner only
function finalizeWinner(uint256 bountyId, uint256 winnerIndex) external; // owner only

// View
function getBounty(uint256 bountyId) external view returns (...);
function getSubmission(uint256 bountyId, uint256 index) external view returns (...);
function getRevealedCount(uint256 bountyId) external view returns (uint256);
function computeCommitment(string answer, bytes32 salt, address sender, uint256 bountyId) external pure returns (bytes32);
```

---

## Test Results

```
AIJudge — Commit-Reveal
  createBounty
    ✔ creates with commit + reveal deadlines
    ✔ rejects if reveal <= commit
  submitCommitment
    ✔ stores commitment hash
    ✔ rejects duplicate sender
  revealAnswer
    ✔ reveals after commit deadline
    ✔ rejects wrong salt
    ✔ rejects wrong answer
    ✔ rejects double reveal
    ✔ rejects before commit deadline
  computeCommitment helper
    ✔ matches on-chain computation

10 passing
```

---

## Deployment

**Contract:** [`0x0965b988d89346EF385844470b7451659E3c78AB`](https://explorer.ritualfoundation.org/address/0x0965b988d89346EF385844470b7451659E3c78AB)
**Chain:** Ritual Chain (ID 1979)
**RPC:** `https://rpc.ritualfoundation.org`

---

## Quick Start

```bash
# Clone
git clone https://github.com/frianowzki/ritual-chain-workshop.git
cd ritual-chain-workshop

# Install & Compile
cd hardhat
npm install
npx hardhat compile

# Test
npx hardhat test test/AIJudge.test.ts

# Deploy (set PRIVATE_KEY in .env)
echo "PRIVATE_KEY=0x..." > .env
npx hardhat ignition deploy ignition/modules/AIJudge.ts --network ritual

# Frontend
cd ../web
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
```

---

## Project Structure

```
ritual-chain-workshop/
├── hardhat/
│   ├── contracts/
│   │   ├── AIJudge.sol          ← Main contract (commit-reveal + AI judge)
│   │   └── utils/
│   │       └── PrecompileConsumer.sol
│   ├── test/
│   │   └── AIJudge.test.ts      ← 10 test cases
│   └── ignition/modules/
│       └── AIJudge.ts           ← Deployment module
├── web/
│   ├── src/
│   │   ├── app/page.tsx         ← Main UI
│   │   ├── components/
│   │   │   ├── CreateBountyForm.tsx
│   │   │   ├── SubmitCommitment.tsx
│   │   │   ├── RevealAnswer.tsx
│   │   │   ├── JudgeAll.tsx
│   │   │   ├── FinalizeWinner.tsx
│   │   │   └── SubmissionsList.tsx
│   │   └── lib/
│   │       ├── ritualLlm.ts     ← Ritual LLM encoding
│   │       └── bounty.ts        ← Types & helpers
│   └── .env.local
└── README.md
```

---

<div align="center">

**Built for the [Ritual](https://ritual.foundation) Workshop — June 2026**

</div>
