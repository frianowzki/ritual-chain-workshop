import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, toBytes, encodePacked, parseEther } from "viem";

describe("AIJudge — Commit-Reveal", async function () {
  const { viem, networkHelpers } = await network.create();

  const COMMIT_DURATION = 3600;
  const REVEAL_DURATION = 7200;

  function makeCommitment(
    answer: string,
    salt: `0x${string}`,
    sender: `0x${string}`,
    bountyId: bigint
  ): `0x${string}` {
    return keccak256(
      encodePacked(
        ["string", "bytes32", "address", "uint256"],
        [answer, salt, sender, bountyId]
      )
    );
  }

  async function createBounty() {
    const [owner, alice, bob] = await viem.getWalletClients();
    const judge = await viem.deployContract("AIJudge");
    const now = BigInt(await networkHelpers.time.latest());
    const commitDeadline = now + BigInt(COMMIT_DURATION);
    const revealDeadline = now + BigInt(REVEAL_DURATION);

    await judge.write.createBounty(
      ["Test Bounty", "Best answer wins", commitDeadline, revealDeadline],
      { value: parseEther("1"), account: owner.account }
    );

    return { judge, owner, alice, bob, commitDeadline, revealDeadline };
  }

  describe("createBounty", function () {
    it("creates with commit + reveal deadlines", async function () {
      const { judge, owner, commitDeadline, revealDeadline } = await createBounty();
      const bounty = await judge.read.getBounty([1n]);
      assert.equal(bounty[0].toLowerCase(), owner.account.address.toLowerCase());
      assert.equal(bounty[1], "Test Bounty");
      assert.equal(bounty[4], commitDeadline);
      assert.equal(bounty[5], revealDeadline);
    });

    it("rejects if reveal <= commit", async function () {
      const [owner] = await viem.getWalletClients();
      const judge = await viem.deployContract("AIJudge");
      const now = BigInt(await networkHelpers.time.latest());

      await assert.rejects(
        judge.write.createBounty(
          ["T", "R", now + 100n, now + 100n],
          { value: parseEther("1"), account: owner.account }
        ),
        (err: Error) => {
          assert.ok(err.message.includes("reveal must be after commit"));
          return true;
        }
      );
    });
  });

  describe("submitCommitment", function () {
    it("stores commitment hash", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("random-salt"));
      const commitment = makeCommitment("hello", salt, alice.account.address, 1n);

      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      const sub = await judge.read.getSubmission([1n, 0n]);
      assert.equal(sub[0].toLowerCase(), alice.account.address.toLowerCase());
      assert.equal(sub[1], commitment);
      assert.equal(sub[2], false);
      assert.equal(sub[3], "");
    });

    it("rejects duplicate sender", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("s"));
      const c = makeCommitment("a", salt, alice.account.address, 1n);
      await judge.write.submitCommitment([1n, c], { account: alice.account });
      await assert.rejects(
        judge.write.submitCommitment([1n, c], { account: alice.account }),
        (err: Error) => {
          assert.ok(err.message.includes("already committed"));
          return true;
        }
      );
    });
  });

  describe("revealAnswer", function () {
    it("reveals after commit deadline", async function () {
      const { judge, alice } = await createBounty();
      const answer = "The answer is 42";
      const salt = keccak256(toBytes("my-secret-salt"));
      const commitment = makeCommitment(answer, salt, alice.account.address, 1n);

      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      await networkHelpers.time.increase(COMMIT_DURATION + 1);

      await judge.write.revealAnswer([1n, answer, salt], {
        account: alice.account,
      });

      const sub = await judge.read.getSubmission([1n, 0n]);
      assert.equal(sub[2], true);
      assert.equal(sub[3], answer);
    });

    it("rejects wrong salt", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("real-salt"));
      const commitment = makeCommitment("answer", salt, alice.account.address, 1n);
      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      await networkHelpers.time.increase(COMMIT_DURATION + 1);

      const wrongSalt = keccak256(toBytes("wrong-salt"));
      await assert.rejects(
        judge.write.revealAnswer([1n, "answer", wrongSalt], {
          account: alice.account,
        }),
        (err: Error) => {
          assert.ok(err.message.includes("hash mismatch"));
          return true;
        }
      );
    });

    it("rejects wrong answer", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("salt"));
      const commitment = makeCommitment("correct", salt, alice.account.address, 1n);
      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      await networkHelpers.time.increase(COMMIT_DURATION + 1);

      await assert.rejects(
        judge.write.revealAnswer([1n, "wrong", salt], {
          account: alice.account,
        }),
        (err: Error) => {
          assert.ok(err.message.includes("hash mismatch"));
          return true;
        }
      );
    });

    it("rejects double reveal", async function () {
      const { judge, alice } = await createBounty();
      const answer = "ans";
      const salt = keccak256(toBytes("s"));
      const commitment = makeCommitment(answer, salt, alice.account.address, 1n);
      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      await networkHelpers.time.increase(COMMIT_DURATION + 1);

      await judge.write.revealAnswer([1n, answer, salt], {
        account: alice.account,
      });
      await assert.rejects(
        judge.write.revealAnswer([1n, answer, salt], {
          account: alice.account,
        }),
        (err: Error) => {
          assert.ok(err.message.includes("already revealed"));
          return true;
        }
      );
    });

    it("rejects before commit deadline", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("s"));
      const commitment = makeCommitment("a", salt, alice.account.address, 1n);
      await judge.write.submitCommitment([1n, commitment], {
        account: alice.account,
      });

      await assert.rejects(
        judge.write.revealAnswer([1n, "a", salt], {
          account: alice.account,
        }),
        (err: Error) => {
          assert.ok(err.message.includes("commit phase still active"));
          return true;
        }
      );
    });
  });

  describe("computeCommitment helper", function () {
    it("matches on-chain computation", async function () {
      const { judge, alice } = await createBounty();
      const salt = keccak256(toBytes("test-salt"));
      const answer = "hello world";
      const bountyId = 1n;

      const expected = makeCommitment(answer, salt, alice.account.address, bountyId);
      const onChain = await judge.read.computeCommitment([
        answer,
        salt,
        alice.account.address,
        bountyId,
      ]);

      assert.equal(onChain, expected);
    });
  });
});
