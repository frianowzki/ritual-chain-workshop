import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, toHex, parseEther, pad } from "viem";

/**
 * CommitRevealBounty — test plan for reveal edge cases.
 *
 * Tests cover:
 *   1. Happy path: commit → reveal → finalize
 *   2. Hash verification: wrong salt, wrong answer, wrong address
 *   3. Phase enforcement: reveal before deadline, commit after deadline
 *   4. Edge cases: empty answer, double commit, double reveal
 */

// Helper: compute commitment hash matching Solidity's abi.encodePacked
function computeCommitment(
  answer: string,
  salt: `0x${string}`,
  submitter: `0x${string}`,
  bountyId: bigint,
): `0x${string}` {
  const answerHex = toHex(toBytes(answer)).slice(2);
  const saltHex = salt.slice(2);
  const addrHex = submitter.slice(2).toLowerCase();
  const idHex = bountyId.toString(16).padStart(64, "0");
  return keccak256(`0x${answerHex}${saltHex}${addrHex}${idHex}` as `0x${string}`);
}

// Helper: make a valid 32-byte hex salt
function makeSalt(s: string): `0x${string}` {
  return toHex(pad(toBytes(s), { size: 32 }));
}

// Helper: get current block timestamp + offset
async function getDeadline(publicClient: any, offsetSeconds: number): Promise<bigint> {
  const block = await publicClient.getBlock();
  return block.timestamp + BigInt(offsetSeconds);
}

describe("CommitRevealBounty", async function () {
  const { viem, provider } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [owner, alice, bob] = await viem.getWalletClients();

  // ─── 1. Happy Path ──────────────────────────────────────────────

  it("Full lifecycle: commit -> reveal -> finalize", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    const bountyId = 1n;
    await bounty.write.createBounty(
      ["Test Bounty", "Correctness 100%", commitDeadline, revealDeadline],
      { value: parseEther("1") },
    );

    // Alice commits
    const salt = makeSalt("alice-salt-1234567890abcdef");
    const commitment = computeCommitment("Alice answer", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    // Verify commitment stored
    const c = await bounty.read.getCommitment([bountyId, 0n]);
    assert.equal(c[0].toLowerCase(), alice.account.address.toLowerCase());
    assert.equal(c[1], commitment);
    assert.equal(c[2], false);

    // Advance time past commit deadline
    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    // Alice reveals
    await bounty.write.revealAnswer([bountyId, "Alice answer", salt], { account: alice.account });

    // Verify reveal
    const c2 = await bounty.read.getCommitment([bountyId, 0n]);
    assert.equal(c2[2], true);
    assert.equal(c2[3], "Alice answer");

    // Check phase advanced to Reveal
    const bountyData = await bounty.read.getBounty([bountyId]);
    assert.equal(Number(bountyData[6]), 1); // Phase.Reveal

    const revealedCount = await bounty.read.getRevealedCount([bountyId]);
    assert.equal(revealedCount, 1n);
  });

  // ─── 2. Hash Verification ───────────────────────────────────────

  it("Reject reveal with wrong salt", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Salt Test", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const correctSalt = makeSalt("correct-salt");
    const wrongSalt = makeSalt("wrong-salt-0000");

    const commitment = computeCommitment("my answer", correctSalt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "my answer", wrongSalt], { account: alice.account }),
      /hash mismatch/,
    );
  });

  it("Reject reveal with wrong answer", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Answer Test", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("correct answer", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "wrong answer", salt], { account: alice.account }),
      /hash mismatch/,
    );
  });

  it("Reject reveal from different address", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Address Test", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const answer = "alice answer";

    const commitment = computeCommitment(answer, salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, answer, salt], { account: bob.account }),
      /no commitment found/,
    );
  });

  // ─── 3. Phase Enforcement ───────────────────────────────────────

  it("Reject reveal during commit phase (before commit deadline)", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Early Reveal", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("answer", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "answer", salt], { account: alice.account }),
      /commit phase still active/,
    );
  });

  it("Reject commitment after commit deadline", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Late Commit", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("answer", salt, alice.account.address, bountyId);

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.submitCommitment([bountyId, commitment], { account: alice.account }),
      /commit phase closed/,
    );
  });

  it("Reject reveal after reveal deadline", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Late Reveal", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("answer", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [7300]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "answer", salt], { account: alice.account }),
      /reveal phase closed/,
    );
  });

  // ─── 4. Edge Cases ──────────────────────────────────────────────

  it("Reject double commit from same address", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Double Commit", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt1 = makeSalt("salt1-1234567890ab");
    const salt2 = makeSalt("salt2-1234567890ab");

    const c1 = computeCommitment("answer1", salt1, alice.account.address, bountyId);
    const c2 = computeCommitment("answer2", salt2, alice.account.address, bountyId);

    await bounty.write.submitCommitment([bountyId, c1], { account: alice.account });

    await assert.rejects(
      bounty.write.submitCommitment([bountyId, c2], { account: alice.account }),
      /already committed/,
    );
  });

  it("Reject double reveal", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Double Reveal", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("answer", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await bounty.write.revealAnswer([bountyId, "answer", salt], { account: alice.account });

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "answer", salt], { account: alice.account }),
      /already revealed/,
    );
  });

  it("Reject empty commitment", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Empty Commit", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;

    await assert.rejects(
      bounty.write.submitCommitment(
        [bountyId, "0x0000000000000000000000000000000000000000000000000000000000000000"],
        { account: alice.account },
      ),
      /empty commitment/,
    );
  });

  it("Reject empty answer on reveal", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Empty Answer", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("0.1") },
    );

    const bountyId = 1n;
    const salt = makeSalt("salt-1234567890abc");
    const commitment = computeCommitment("", salt, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, commitment], { account: alice.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await assert.rejects(
      bounty.write.revealAnswer([bountyId, "", salt], { account: alice.account }),
      /empty answer/,
    );
  });

  it("Reject createBounty with past commit deadline", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const pastDeadline = await getDeadline(publicClient, -100);
    const futureDeadline = await getDeadline(publicClient, 3600);

    await assert.rejects(
      bounty.write.createBounty(
        ["Past Deadline", "rubric", pastDeadline, futureDeadline],
        { value: parseEther("0.1") },
      ),
      /commit deadline must be future/,
    );
  });

  it("Reject createBounty with reveal before commit deadline", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const laterDeadline = await getDeadline(publicClient, 7200);
    const earlierDeadline = await getDeadline(publicClient, 3600);

    await assert.rejects(
      bounty.write.createBounty(
        ["Bad Order", "rubric", laterDeadline, earlierDeadline],
        { value: parseEther("0.1") },
      ),
      /reveal must be after commit/,
    );
  });

  it("Multiple participants: commit and reveal correctly", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");
    const commitDeadline = await getDeadline(publicClient, 3600);
    const revealDeadline = await getDeadline(publicClient, 7200);

    await bounty.write.createBounty(
      ["Multi Participant", "rubric", commitDeadline, revealDeadline],
      { value: parseEther("1") },
    );

    const bountyId = 1n;

    const saltA = makeSalt("alice-salt-1234567890");
    const cA = computeCommitment("Alice's answer", saltA, alice.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, cA], { account: alice.account });

    const saltB = makeSalt("bob-salt-1234567890ab");
    const cB = computeCommitment("Bob's answer", saltB, bob.account.address, bountyId);
    await bounty.write.submitCommitment([bountyId, cB], { account: bob.account });

    await provider.send("evm_increaseTime", [3700]);
    await provider.send("evm_mine", []);

    await bounty.write.revealAnswer([bountyId, "Alice's answer", saltA], { account: alice.account });
    await bounty.write.revealAnswer([bountyId, "Bob's answer", saltB], { account: bob.account });

    const count = await bounty.read.getRevealedCount([bountyId]);
    assert.equal(count, 2n);

    const c1 = await bounty.read.getCommitment([bountyId, 0n]);
    assert.equal(c1[2], true);
    assert.equal(c1[3], "Alice's answer");

    const c2 = await bounty.read.getCommitment([bountyId, 1n]);
    assert.equal(c2[2], true);
    assert.equal(c2[3], "Bob's answer");
  });

  it("computeCommitment helper matches on-chain computation", async function () {
    const bounty = await viem.deployContract("CommitRevealBounty");

    const answer = "test answer";
    const salt = makeSalt("test-salt-1234567890");
    const submitter = alice.account.address;
    const bountyId = 1n;

    const offChain = computeCommitment(answer, salt, submitter, bountyId);
    const onChain = await bounty.read.computeCommitment([answer, salt, submitter, bountyId]);

    assert.equal(offChain, onChain);
  });
});
