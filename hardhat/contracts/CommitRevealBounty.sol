// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrecompileConsumer} from "./utils/PrecompileConsumer.sol";

interface IRitualWallet {
    function deposit(uint256 lockDuration) external payable;
    function depositFor(address user, uint256 lockDuration) external payable;
    function withdraw(uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
    function lockUntil(address) external view returns (uint256);
}

/**
 * @title CommitRevealBounty
 * @notice Privacy-preserving AI bounty judge with commit-reveal scheme.
 *
 * Lifecycle:
 *   1. Owner creates bounty → funds locked in contract
 *   2. Participants submit COMMITMENT (keccak256 hash) during submission phase
 *   3. After commit deadline → participants REVEAL their answer + salt
 *   4. Contract verifies keccak256(answer, salt, msg.sender, bountyId) == commitment
 *   5. Owner triggers AI JUDGING on valid revealed answers only
 *   6. Owner FINALIZES winner → reward transferred
 *
 * Security: Answers are hidden until reveal phase. Commitment binds answer +
 * salt + submitter + bountyId, preventing copying and frontrunning.
 */
contract CommitRevealBounty is PrecompileConsumer {
    uint256 public constant MAX_SUBMISSIONS = 10;
    uint256 public constant MAX_ANSWER_LENGTH = 2_000;

    uint256 public nextBountyId = 1;

    IRitualWallet wallet =
        IRitualWallet(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948);

    // ─── Phase enum ──────────────────────────────────────────────────
    enum Phase {
        Open,           // accepting commitments
        Reveal,         // commitments closed, accepting reveals
        Judged,         // AI review complete
        Finalized       // winner paid out
    }

    // ─── Data structures ─────────────────────────────────────────────
    struct Commitment {
        address submitter;
        bytes32 hash;
        bool revealed;
        string answer;          // populated after reveal
    }

    struct Bounty {
        address owner;
        string title;
        string rubric;
        uint256 reward;
        uint256 commitDeadline; // after this, no new commitments
        uint256 revealDeadline; // after this, no new reveals
        Phase phase;
        bytes aiReview;
        uint256 winnerIndex;
        Commitment[] commitments;
    }

    struct ConvoHistory {
        string storageType;
        string path;
        string secretsName;
    }

    mapping(uint256 => Bounty) public bounties;

    // ─── Events ──────────────────────────────────────────────────────
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed owner,
        string title,
        uint256 reward,
        uint256 commitDeadline,
        uint256 revealDeadline
    );

    event CommitmentSubmitted(
        uint256 indexed bountyId,
        uint256 indexed commitmentIndex,
        address indexed submitter
    );

    event AnswerRevealed(
        uint256 indexed bountyId,
        uint256 indexed commitmentIndex,
        address indexed submitter
    );

    event AllAnswersJudged(uint256 indexed bountyId, bytes aiReview);

    event WinnerFinalized(
        uint256 indexed bountyId,
        uint256 indexed winnerIndex,
        address indexed winner,
        uint256 reward
    );

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner(uint256 bountyId) {
        require(msg.sender == bounties[bountyId].owner, "not bounty owner");
        _;
    }

    modifier bountyExists(uint256 bountyId) {
        require(bounties[bountyId].owner != address(0), "bounty not found");
        _;
    }

    // ─── Core Functions ──────────────────────────────────────────────

    /**
     * @notice Create a new bounty with separate commit and reveal deadlines.
     * @param title         Short description
     * @param rubric        Judging criteria for the AI
     * @param commitDeadline  Unix timestamp: last moment to submit commitments
     * @param revealDeadline  Unix timestamp: last moment to reveal answers
     */
    function createBounty(
        string calldata title,
        string calldata rubric,
        uint256 commitDeadline,
        uint256 revealDeadline
    ) external payable returns (uint256 bountyId) {
        require(msg.value > 0, "reward required");
        require(commitDeadline > block.timestamp, "commit deadline must be future");
        require(revealDeadline > commitDeadline, "reveal must be after commit");

        bountyId = nextBountyId++;

        Bounty storage bounty = bounties[bountyId];
        bounty.owner = msg.sender;
        bounty.title = title;
        bounty.rubric = rubric;
        bounty.reward = msg.value;
        bounty.commitDeadline = commitDeadline;
        bounty.revealDeadline = revealDeadline;
        bounty.phase = Phase.Open;
        bounty.winnerIndex = type(uint256).max;

        emit BountyCreated(
            bountyId, msg.sender, title, msg.value,
            commitDeadline, revealDeadline
        );
    }

    /**
     * @notice Submit a commitment hash during the open phase.
     * @dev commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
     * @param bountyId    Which bounty
     * @param commitment  The keccak256 hash binding the answer
     */
    function submitCommitment(
        uint256 bountyId,
        bytes32 commitment
    ) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.phase == Phase.Open, "not accepting commitments");
        require(block.timestamp <= bounty.commitDeadline, "commit phase closed");
        require(
            bounty.commitments.length < MAX_SUBMISSIONS,
            "max submissions reached"
        );
        require(commitment != bytes32(0), "empty commitment");

        // Prevent same address from committing twice
        for (uint256 i = 0; i < bounty.commitments.length; i++) {
            require(
                bounty.commitments[i].submitter != msg.sender,
                "already committed"
            );
        }

        bounty.commitments.push(
            Commitment({
                submitter: msg.sender,
                hash: commitment,
                revealed: false,
                answer: ""
            })
        );

        emit CommitmentSubmitted(
            bountyId,
            bounty.commitments.length - 1,
            msg.sender
        );
    }

    /**
     * @notice Reveal your answer after the commit phase closes.
     * @dev Contract verifies keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
     *      matches the stored commitment hash.
     * @param bountyId  Which bounty
     * @param answer    The plaintext answer
     * @param salt      The secret salt used during commitment
     */
    function revealAnswer(
        uint256 bountyId,
        string calldata answer,
        bytes32 salt
    ) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(
            block.timestamp > bounty.commitDeadline,
            "commit phase still active"
        );
        require(
            block.timestamp <= bounty.revealDeadline,
            "reveal phase closed"
        );
        require(bytes(answer).length <= MAX_ANSWER_LENGTH, "answer too long");
        require(bytes(answer).length > 0, "empty answer");

        // Auto-advance phase to Reveal when first reveal comes in
        if (bounty.phase == Phase.Open) {
            bounty.phase = Phase.Reveal;
        }

        // Find this sender's commitment
        uint256 idx = type(uint256).max;
        for (uint256 i = 0; i < bounty.commitments.length; i++) {
            if (bounty.commitments[i].submitter == msg.sender) {
                idx = i;
                break;
            }
        }
        require(idx != type(uint256).max, "no commitment found");
        require(!bounty.commitments[idx].revealed, "already revealed");

        // Verify the commitment hash
        bytes32 computed = keccak256(
            abi.encodePacked(answer, salt, msg.sender, bountyId)
        );
        require(computed == bounty.commitments[idx].hash, "hash mismatch");

        bounty.commitments[idx].revealed = true;
        bounty.commitments[idx].answer = answer;

        emit AnswerRevealed(bountyId, idx, msg.sender);
    }

    /**
     * @notice Owner triggers AI judging on all valid revealed answers.
     * @dev Only revealed answers are included in the LLM prompt.
     * @param bountyId   Which bounty
     * @param llmInput   Precompile-encoded LLM request (must include revealed answers)
     */
    function judgeAll(
        uint256 bountyId,
        bytes calldata llmInput
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.phase == Phase.Reveal || bounty.phase == Phase.Open,
            "already judged or finalized"
        );
        require(
            block.timestamp > bounty.commitDeadline,
            "commit phase not over"
        );

        // At least one answer must be revealed
        bool hasRevealed = false;
        for (uint256 i = 0; i < bounty.commitments.length; i++) {
            if (bounty.commitments[i].revealed) {
                hasRevealed = true;
                break;
            }
        }
        require(hasRevealed, "no revealed answers");

        bytes memory output = _executePrecompile(
            LLM_INFERENCE_PRECOMPILE,
            llmInput
        );

        (
            bool hasError,
            bytes memory completionData,
            ,
            string memory errorMessage,

        ) = abi.decode(output, (bool, bytes, bytes, string, ConvoHistory));

        require(!hasError, errorMessage);

        bounty.phase = Phase.Judged;
        bounty.aiReview = completionData;

        emit AllAnswersJudged(bountyId, completionData);
    }

    /**
     * @notice Owner picks the winner and triggers reward payout.
     * @param bountyId     Which bounty
     * @param winnerIndex  Index of the winning commitment (must be revealed)
     */
    function finalizeWinner(
        uint256 bountyId,
        uint256 winnerIndex
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.phase == Phase.Judged, "not judged yet");
        require(
            winnerIndex < bounty.commitments.length,
            "invalid winner index"
        );
        require(
            bounty.commitments[winnerIndex].revealed,
            "winner must have revealed"
        );

        bounty.phase = Phase.Finalized;
        bounty.winnerIndex = winnerIndex;

        address winner = bounty.commitments[winnerIndex].submitter;
        uint256 reward = bounty.reward;
        bounty.reward = 0;

        (bool ok, ) = payable(winner).call{value: reward}("");
        require(ok, "payment failed");

        emit WinnerFinalized(bountyId, winnerIndex, winner, reward);
    }

    // ─── View Functions ──────────────────────────────────────────────

    function getBounty(
        uint256 bountyId
    )
        external
        view
        bountyExists(bountyId)
        returns (
            address owner,
            string memory title,
            string memory rubric,
            uint256 reward,
            uint256 commitDeadline,
            uint256 revealDeadline,
            Phase phase,
            uint256 commitmentCount,
            uint256 winnerIndex,
            bytes memory aiReview
        )
    {
        Bounty storage bounty = bounties[bountyId];

        return (
            bounty.owner,
            bounty.title,
            bounty.rubric,
            bounty.reward,
            bounty.commitDeadline,
            bounty.revealDeadline,
            bounty.phase,
            bounty.commitments.length,
            bounty.winnerIndex,
            bounty.aiReview
        );
    }

    function getCommitment(
        uint256 bountyId,
        uint256 index
    )
        external
        view
        bountyExists(bountyId)
        returns (
            address submitter,
            bytes32 hash,
            bool revealed,
            string memory answer
        )
    {
        Bounty storage bounty = bounties[bountyId];
        require(index < bounty.commitments.length, "invalid index");

        Commitment storage c = bounty.commitments[index];
        return (c.submitter, c.hash, c.revealed, c.answer);
    }

    /**
     * @notice Get count of valid (revealed) answers for a bounty.
     */
    function getRevealedCount(
        uint256 bountyId
    ) external view bountyExists(bountyId) returns (uint256) {
        Bounty storage bounty = bounties[bountyId];
        uint256 count = 0;
        for (uint256 i = 0; i < bounty.commitments.length; i++) {
            if (bounty.commitments[i].revealed) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Compute the expected commitment hash off-chain helper.
     * @dev Use this to generate the correct hash before calling submitCommitment.
     */
    function computeCommitment(
        string calldata answer,
        bytes32 salt,
        address submitter,
        uint256 bountyId
    ) external pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(answer, salt, submitter, bountyId)
            );
    }
}
