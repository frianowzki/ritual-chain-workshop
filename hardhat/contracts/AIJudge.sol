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
 * @title AIJudge
 * @notice Privacy-preserving AI bounty judge with commit-reveal scheme.
 *
 * Lifecycle:
 *   1. Owner creates bounty with commit + reveal deadlines
 *   2. Participants submit commitment hash (keccak256) during commit phase
 *   3. After commit deadline → participants reveal answer + salt
 *   4. Contract verifies keccak256(answer, salt, msg.sender, bountyId) == commitment
 *   5. Owner triggers AI judging on revealed answers only
 *   6. Owner finalizes winner → reward transferred
 */
contract AIJudge is PrecompileConsumer {
    uint256 public constant MAX_SUBMISSIONS = 10;
    uint256 public constant MAX_ANSWER_LENGTH = 2_000;

    uint256 public nextBountyId = 1;



    IRitualWallet wallet =
        IRitualWallet(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948);

    // ─── Data structures ─────────────────────────────────────────────

    struct Submission {
        address submitter;
        bytes32 commitment; // keccak256(answer, salt, sender, bountyId)
        bool revealed;
        string answer; // populated after reveal
    }

    struct Bounty {
        address owner;
        string title;
        string rubric;
        uint256 reward;
        uint256 commitDeadline; // after this, no new commitments
        uint256 revealDeadline; // after this, no new reveals
        bool judged;
        bool finalized;
        bytes aiReview;
        uint256 winnerIndex;
        Submission[] submissions;
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
        uint256 indexed submissionIndex,
        address indexed submitter
    );

    event AnswerRevealed(
        uint256 indexed bountyId,
        uint256 indexed submissionIndex,
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
        bounty.winnerIndex = type(uint256).max;

        emit BountyCreated(
            bountyId, msg.sender, title, msg.value,
            commitDeadline, revealDeadline
        );
    }

    /**
     * @notice Submit a commitment hash during the commit phase.
     * @dev commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
     */
    function submitCommitment(
        uint256 bountyId,
        bytes32 commitment
    ) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp <= bounty.commitDeadline, "commit phase closed");
        require(!bounty.judged, "already judged");
        require(!bounty.finalized, "already finalized");
        require(
            bounty.submissions.length < MAX_SUBMISSIONS,
            "max submissions reached"
        );
        require(commitment != bytes32(0), "empty commitment");

        // Prevent same address from committing twice
        for (uint256 i = 0; i < bounty.submissions.length; i++) {
            require(
                bounty.submissions[i].submitter != msg.sender,
                "already committed"
            );
        }

        bounty.submissions.push(
            Submission({
                submitter: msg.sender,
                commitment: commitment,
                revealed: false,
                answer: ""
            })
        );

        emit CommitmentSubmitted(
            bountyId, bounty.submissions.length - 1, msg.sender
        );
    }

    /**
     * @notice Reveal your answer after the commit phase closes.
     * @dev Contract verifies keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
     *      matches the stored commitment.
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

        // Find this sender's commitment
        uint256 idx = type(uint256).max;
        for (uint256 i = 0; i < bounty.submissions.length; i++) {
            if (bounty.submissions[i].submitter == msg.sender) {
                idx = i;
                break;
            }
        }
        require(idx != type(uint256).max, "no commitment found");
        require(!bounty.submissions[idx].revealed, "already revealed");

        // Verify the commitment hash
        bytes32 computed = keccak256(
            abi.encodePacked(answer, salt, msg.sender, bountyId)
        );
        require(computed == bounty.submissions[idx].commitment, "hash mismatch");

        bounty.submissions[idx].revealed = true;
        bounty.submissions[idx].answer = answer;

        emit AnswerRevealed(bountyId, idx, msg.sender);
    }

    /**
     * @notice Owner triggers AI judging on all valid revealed answers.
     */
    function judgeAll(
        uint256 bountyId,
        bytes calldata llmInput
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(!bounty.judged, "already judged");
        require(!bounty.finalized, "already finalized");
        require(block.timestamp > bounty.commitDeadline, "commit phase not over");

        // At least one answer must be revealed
        bool hasRevealed = false;
        for (uint256 i = 0; i < bounty.submissions.length; i++) {
            if (bounty.submissions[i].revealed) {
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

        bounty.judged = true;
        bounty.aiReview = completionData;

        emit AllAnswersJudged(bountyId, completionData);
    }

    /**
     * @notice Owner picks the winner and triggers reward payout.
     */
    function finalizeWinner(
        uint256 bountyId,
        uint256 winnerIndex
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.judged, "not judged yet");
        require(!bounty.finalized, "already finalized");
        require(
            winnerIndex < bounty.submissions.length,
            "invalid winner index"
        );
        require(
            bounty.submissions[winnerIndex].revealed,
            "winner must have revealed"
        );

        bounty.finalized = true;
        bounty.winnerIndex = winnerIndex;

        address winner = bounty.submissions[winnerIndex].submitter;
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
            bool judged,
            bool finalized,
            uint256 submissionCount,
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
            bounty.judged,
            bounty.finalized,
            bounty.submissions.length,
            bounty.winnerIndex,
            bounty.aiReview
        );
    }

    /**
     * @notice Get a submission. Answer is empty until revealed.
     */
    function getSubmission(
        uint256 bountyId,
        uint256 index
    )
        external
        view
        bountyExists(bountyId)
        returns (
            address submitter,
            bytes32 commitment,
            bool revealed,
            string memory answer
        )
    {
        Bounty storage bounty = bounties[bountyId];
        require(index < bounty.submissions.length, "invalid index");

        Submission storage s = bounty.submissions[index];
        return (s.submitter, s.commitment, s.revealed, s.answer);
    }

    /**
     * @notice Get count of revealed submissions for a bounty.
     */
    function getRevealedCount(
        uint256 bountyId
    ) external view bountyExists(bountyId) returns (uint256) {
        Bounty storage bounty = bounties[bountyId];
        uint256 count = 0;
        for (uint256 i = 0; i < bounty.submissions.length; i++) {
            if (bounty.submissions[i].revealed) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Off-chain helper: compute the expected commitment hash.
     */
    function computeCommitment(
        string calldata answer,
        bytes32 salt,
        address submitter,
        uint256 bountyId
    ) external pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(answer, salt, submitter, bountyId)
        );
    }
}
