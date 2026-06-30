<div align="center">

# 🔐 Privacy-Preserving AI Bounty Judge

### *What if bounty answers stayed invisible until everyone had already committed theirs?*

A commit-reveal bounty system powered by **on-chain AI judging** via [Ritual Chain](https://ritual.foundation) precompiles. Built to eliminate the one flaw that plagues every open bounty: **copying.**

<br>

![Solidity](https://img.shields.io/badge/Solidity-^0.8.28-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Ritual](https://img.shields.io/badge/Ritual_Chain-1979-8B5CF6?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-10%2F10_Passing-22C55E?style=for-the-badge)
![Audit](https://img.shields.io/badge/Audit-Passed-22C55E?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)

<br>

[🚀 Live Demo](https://frianowzki-ai-judge.vercel.app) · [Contract](https://explorer.ritualfoundation.org/address/0x0965b988d89346EF385844470b7451659E3c78AB) · [Tests](#-test-results) · [Quick Start](#-quick-start)

</div>

---

## 🚀 Live Demo

**🔗 [frianowzki-ai-judge.vercel.app](https://frianowzki-ai-judge.vercel.app)**

Connect your wallet (MetaMask) to [Ritual Chain](https://ritual.foundation) (ID `1979`) and try the full bounty workflow:

| Feature | What you can do |
|:---|:---|
| **Dashboard** | View total bounties on-chain, live status, and quick actions |
| **Create Bounty** | Set title, rubric, commit/reveal deadlines, and fund with RITUAL tokens |
| **Commit** | Submit a hashed answer (keccak256) — your answer stays hidden |
| **Reveal** | After commit deadline, reveal your answer + secret code |
| **AI Judge** | Owner triggers Ritual LLM precompile to rank all revealed answers |
| **Finalize** | Owner picks winner — reward transfers automatically |
| **My Bounties** | See bounties you created with status tracking |
| **My Submissions** | Track bounties where you committed/revealed |
| **My Wins** | View won bounties + reward history |

> **Requirements:** MetaMask wallet with [Ritual Chain](https://ritual.foundation) (Chain ID `1979`) configured. You need RITUAL tokens to create bounties or interact with the contract.

---

## 💀 The Problem

Traditional bounty systems are broken. Every answer lives on-chain in plaintext — visible to all, copyable by anyone.

```
Alice submits "ZK rollups are better because..."
   ↓
Bob reads Alice's answer, improves it, submits his own
   ↓
Alice's first-mover advantage → gone
```

**This isn't a hypothetical. It's how every open bounty on EVM works today.**

---

## 🧠 The Solution: Commit-Reveal

We split submission into two cryptographic phases. During Phase 1, **nobody can see anyone's answer** — only an irreversible hash exists on-chain. After the deadline locks all commitments, Phase 2 reveals the actual answers.

```
         PHASE 1: COMMIT                    PHASE 2: REVEAL
    ┌──────────────────────┐           ┌──────────────────────┐
    │                      │           │                      │
    │  Alice → 0x8a3f...   │           │  Alice → "Solidity"  │ ✓ hash verified
    │  Bob   → 0x1c7e...   │    ───►   │  Bob   → "Rust"      │ ✓ hash verified
    │  Carol → 0x9b2d...   │           │  Carol → "Cairo"     │ ✓ hash verified
    │                      │           │                      │
    │  answers: INVISIBLE  │           │  answers: REVEALED   │
    │  chain stores: hash  │           │  chain stores: text  │
    │                      │           │                      │
    └──────────────────────┘           └──────────────────────┘
         ⏰ before deadline                 ⏰ after deadline
```

**Why it works:** All commitments are locked before anyone reveals. By the time Alice's answer becomes visible, Bob's hash is already on-chain — he can't change it.

---

## ⚙️ How It Works

### 1️⃣ Owner Creates a Bounty

```solidity
createBounty(
    "Best L2 Security Analysis",
    "Correctness 40%, Depth 30%, Clarity 30%",
    block.timestamp + 1 days,   // commitDeadline
    block.timestamp + 3 days    // revealDeadline
) { value: 5 ether }
```

Two deadlines create a **forced gap** between committing and revealing:

| Deadline | What happens | Why it matters |
|:---|:---|:---|
| `commitDeadline` | No new commitments after this | Everyone must lock in before anyone reveals |
| `revealDeadline` | No reveals after this | Prevents indefinite limbo |

### 2️⃣ Participants Commit (Answer Hidden)

The participant generates a hash off-chain — the answer never touches the blockchain at this stage.

```javascript
const commitment = keccak256(
    encodePacked(
        ['string', 'bytes32', 'address', 'uint256'],
        [myAnswer, mySalt, myWallet, bountyId]
    )
);

// Submit only the hash
await contract.submitCommitment(bountyId, commitment);
```

**What the chain sees:** `0x8a3f7c2e9b1d...` (irreversible)
**What the chain does NOT see:** your actual answer

### 3️⃣ Participants Reveal (After Commit Deadline)

Once the commit phase closes, participants prove what they submitted:

```solidity
revealAnswer(bountyId, "Your actual answer", salt);
```

The contract recomputes the hash and checks it matches:

```solidity
keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId)) == storedCommitment
```

✅ Match → answer published on-chain
❌ Mismatch → rejected (wrong answer, wrong secret code, or wrong sender)

### 4️⃣ AI Judges All Revealed Answers

The owner triggers a single Ritual LLM precompile call that ranks every revealed answer against the rubric:

```solidity
judgeAll(bountyId, llmInput);  // owner only
```

The LLM runs inside Ritual's TEE (Trusted Execution Environment) — the judging is deterministic and tamper-proof. Results are **advisory** — the owner makes the final decision.

### 5️⃣ Owner Pays the Winner

```solidity
finalizeWinner(bountyId, 2);  // submission #2 wins
```

Reward transfers to the winner. One payout, one winner, zero ambiguity.

---

## 🔒 Commitment Scheme

```
commitment = keccak256(answer ‖ salt ‖ sender ‖ bountyId)
```

Each component serves a purpose:

| Component | Purpose | Attack prevented |
|:---|:---|:---|
| `answer` | The actual submission | — |
| `salt` (secret code) | Random secret | Rainbow tables, brute-force hash reversal |
| `msg.sender` | Committer's address | Stealing someone else's commitment |
| `bountyId` | Target bounty | Cross-bounty replay attacks |

**Cryptographic properties:**
- **Hiding** — `keccak256` is one-way; the answer cannot be derived from the hash
- **Binding** — Once committed, the hash locks the answer permanently
- **Non-transferable** — Tied to the sender's address; no one else can reveal it

---

## 🛡️ Security Audit

| # | Check | Status | Detail |
|:--|:------|:------:|:-------|
| 1 | Reentrancy | ✅ | `reward = 0` before `.call{value}` |
| 2 | Access control | ✅ | `onlyOwner` on `judgeAll`, `finalizeWinner` |
| 3 | Phase enforcement | ✅ | Every function validates timing |
| 4 | Duplicate commits | ✅ | Loop rejects same address twice |
| 5 | Hash verification | ✅ | `keccak256(answer, salt, sender, bountyId)` |
| 6 | Empty inputs | ✅ | Rejects `bytes32(0)` and empty strings |
| 7 | Winner validation | ✅ | Must be a revealed submission |
| 8 | Index bounds | ✅ | `winnerIndex < submissions.length` |
| 9 | Submission cap | ✅ | `MAX_SUBMISSIONS = 10` |
| 10 | Answer length cap | ✅ | `MAX_ANSWER_LENGTH = 2000` |
| 11 | Zero-address bounty | ✅ | `owner != address(0)` check |
| 12 | Winner default | ✅ | `type(uint256).max` (unreachable index) |
| 13 | Timestamp handling | ✅ | `block.timestamp` in ms on Ritual Chain — frontend sends ms |

### ⚠️ Ritual Chain: `block.timestamp` is Milliseconds

Unlike standard EVM chains (where `block.timestamp` is seconds), **Ritual Chain returns `block.timestamp` in milliseconds**. This affects all deadline comparisons:

```solidity
// Both sides are in milliseconds — comparison works correctly
require(commitDeadline > block.timestamp, "commit deadline must be future");
```

The frontend must send millisecond timestamps:

```typescript
// ✅ Correct — send ms directly
const commitTs = BigInt(new Date(y, m-1, d, h, min).getTime());

// ❌ Wrong — this divides by 1000, sending seconds
const commitTs = BigInt(Math.floor(commitMs / 1000));
```


---

## 🧪 Test Results

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
      ✔ rejects wrong secret code
      ✔ rejects wrong answer
      ✔ rejects double reveal
      ✔ rejects before commit deadline

    computeCommitment helper
      ✔ matches on-chain computation

  ─────────────────────────────
  10 passing  ✅  0 failing
```

---

## 📦 Contract Interface

```solidity
// ─── Lifecycle ─────────────────────────────────────────────────────

function createBounty(
    string calldata title,
    string calldata rubric,
    uint256 commitDeadline,
    uint256 revealDeadline
) external payable returns (uint256 bountyId);

function submitCommitment(uint256 bountyId, bytes32 commitment) external;
function revealAnswer(uint256 bountyId, string calldata answer, bytes32 salt) external;
function judgeAll(uint256 bountyId, bytes calldata llmInput) external;          // owner
function finalizeWinner(uint256 bountyId, uint256 winnerIndex) external;        // owner

// ─── Views ─────────────────────────────────────────────────────────

function getBounty(uint256 bountyId) external view returns (...);
function getSubmission(uint256 bountyId, uint256 index) external view returns (...);
function getRevealedCount(uint256 bountyId) external view returns (uint256);
function computeCommitment(string, bytes32, address, uint256) external pure returns (bytes32);
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/frianowzki/ritual-chain-workshop.git
cd ritual-chain-workshop

# ─── Smart Contract ─────────────────────────────
cd hardhat
npm install
npx hardhat compile
npx hardhat test test/AIJudge.test.ts          # 10/10

# Deploy (needs PRIVATE_KEY with ≥0.35 RITUAL balance)
echo "PRIVATE_KEY=0x..." > .env
npx hardhat ignition deploy ignition/modules/AIJudge.ts --network ritual

# ─── Frontend ───────────────────────────────────
cd ../web
pnpm install
cp .env.example .env.local                     # set NEXT_PUBLIC_CONTRACT_ADDRESS
pnpm dev                                       # localhost:3000
```

---

## 🏗️ Project Structure

```
ritual-chain-workshop/
│
├── hardhat/
│   ├── contracts/
│   │   ├── AIJudge.sol                    ← Commit-reveal + AI judge
│   │   └── utils/
│   │       └── PrecompileConsumer.sol     ← Ritual precompile interface
│   ├── test/
│   │   └── AIJudge.test.ts                ← 10 tests (commit, reveal, edge cases)
│   └── ignition/modules/
│       └── AIJudge.ts                     ← Hardhat Ignition deployer
│
├── web/
│   ├── public/
│   │   └── favicon.svg                    ← SVG favicon
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   ← Redirects to /dashboard
│   │   │   ├── layout.tsx                ← OG tags, fonts, sidebar layout
│   │   │   ├── globals.css               ← Design tokens, glass, animations
│   │   │   └── dashboard/
│   │   │       └── page.tsx              ← Hero, stats, live bounties, quick actions
│   │   │   └── bounties/
│   │   │       └── page.tsx              ← Browse all bounties
│   │   │   └── bounties/
│   │   │       └── create/
│   │   │           └── page.tsx          ← Create bounty form
│   │   │   └── bounties/
│   │   │       └── [id]/
│   │   │           └── page.tsx          ← Bounty detail page
│   │   │   └── activity/
│   │   │       ├── page.tsx              ← Redirects to /activity/bounties
│   │   │       └── bounties/
│   │   │           └── page.tsx          ← My Bounties
│   │   │       └── submissions/
│   │   │           └── page.tsx          ← My Submissions
│   │   │       └── wins/
│   │   │           └── page.tsx          ← My Wins + rewards
│   │   │   └── network/
│   │   │       ├── page.tsx              ← Network status
│   │   │       └── contract/
│   │   │           └── page.tsx          ← Contract info
│   │   │   └── settings/
│   │   │       └── page.tsx              ← Settings
│   │   ├── components/
│   │   │   ├── Sidebar.tsx                ← Navigation sidebar (manual toggle)
│   │   │   ├── SidebarItem.tsx            ← Nav item with SVG icon
│   │   │   ├── SidebarSection.tsx         ← Section divider
│   │   │   ├── SidebarRitualWallet.tsx    ← Fund panel (balance + deposit)
│   │   │   ├── StatsDashboard.tsx         ← Total Bounties + Status + Live Bounties
│   │   │   ├── LiveBountiesCard.tsx       ← Active bounties grid
│   │   │   ├── BountyGrid.tsx             ← Recent bounties cards + inline detail
│   │   │   ├── BountyView.tsx             ← Full bounty detail + actions
│   │   │   ├── BountyDetail.tsx           ← Bounty info + owner badge
│   │   │   ├── CreateBountyForm.tsx       ← Dual-deadline bounty creation
│   │   │   ├── LoadBountyPanel.tsx        ← Load by ID + recent chips
│   │   │   ├── SubmitCommitment.tsx       ← Hash computation + commit
│   │   │   ├── RevealAnswer.tsx           ← Answer + secret code reveal
│   │   │   ├── JudgeAll.tsx               ← Ritual LLM trigger
│   │   │   ├── FinalizeWinner.tsx         ← Winner selection + payout
│   │   │   ├── SubmissionsList.tsx        ← Commit/reveal status per submission
│   │   │   ├── AIReviewDisplay.tsx        ← AI judge results display
│   │   │   ├── Countdown.tsx              ← Deadline countdown timers
│   │   │   ├── WalletConnect.tsx          ← MetaMask connect + dropdown
│   │   │   ├── Toast.tsx                  ← Slide-in notifications
│   │   │   └── ui.tsx                     ← Card, Badge, Button, glass system
│   │   ├── hooks/
│   │   │   ├── useBounty.ts               ← Read bounty state
│   │   │   ├── useWriteTx.ts              ← Transaction state machine
│   │   │   ├── useRecentBounties.ts       ← localStorage-backed recent IDs
│   │   │   └── useNow.ts                  ← Live clock for countdowns
│   │   ├── config/
│   │   │   ├── wagmi.ts                   ← Wagmi + MetaMask connector
│   │   │   └── contract.ts               ← Contract address config
│   │   └── lib/
│   │       ├── ritualLlm.ts               ← Ritual LLM 30-field encoding
│   │       ├── bounty.ts                  ← Types, phases, helpers
│   │       ├── format.ts                  ← Address/reward/time formatting
│   │       └── aiReview.ts               ← AI review decoder
│   └── .env.local
│
└── README.md
```

---

## 🌐 Deployment

| | |
|:---|:---|
| **Frontend** | [🚀 frianowzki-ai-judge.vercel.app](https://frianowzki-ai-judge.vercel.app) |
| **Contract** | [`0x0965b988d89346EF385844470b7451659E3c78AB`](https://explorer.ritualfoundation.org/address/0x0965b988d89346EF385844470b7451659E3c78AB) |
| **Chain** | Ritual Chain (ID `1979`) |
| **RPC** | `https://rpc.ritualfoundation.org` |
| **LLM Precompile** | `0x0802` |
| **RitualWallet** | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` |

---

<div align="center">

**Built for the [Ritual](https://ritual.foundation) Workshop — June 2026**

*Privacy isn't a feature. It's the foundation.*

</div>
