// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * ERC-8004: Agent Reputation Registry
 *
 * Tracks feedback signals (e.g. tournament results) for registered agents.
 * Any third-party "client" (such as the PokerVault contract) can submit
 * feedback; feedback is indexed by (agentId, client, feedbackIndex).
 *
 * Scores and aggregation can be read on-chain for composability.
 */
contract AgentReputationRegistry {
    address public immutable identityRegistry;

    struct Feedback {
        int128 value;          // signed score: +1 win, -1 loss, etc.
        string tag;            // context label, e.g. "poker-tournament"
        bool isRevoked;
        uint64 feedbackIndex;
    }

    // agentId => client address => list of feedbacks
    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;

    // agentId => ordered list of clients who submitted feedback
    mapping(uint256 => address[]) private _clients;

    // agentId => client => whether they've given at least one feedback (for deduplication)
    mapping(uint256 => mapping(address => bool)) private _hasGivenFeedback;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        string tag
    );
    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /**
     * Submit feedback for an agent. msg.sender is the "client" (e.g. PokerVault).
     * @param agentId    The ERC-8004 agent token ID.
     * @param value      Signed score (e.g. +1 for win, -1 for loss).
     * @param tag        Label for context (e.g. "poker-tournament").
     * @return feedbackIndex Index of this feedback entry.
     */
    function giveFeedback(
        uint256 agentId,
        int128 value,
        string calldata tag
    ) external returns (uint64 feedbackIndex) {
        feedbackIndex = uint64(_feedbacks[agentId][msg.sender].length);
        _feedbacks[agentId][msg.sender].push(Feedback({
            value: value,
            tag: tag,
            isRevoked: false,
            feedbackIndex: feedbackIndex
        }));
        if (!_hasGivenFeedback[agentId][msg.sender]) {
            _hasGivenFeedback[agentId][msg.sender] = true;
            _clients[agentId].push(msg.sender);
        }
        emit NewFeedback(agentId, msg.sender, feedbackIndex, value, tag);
    }

    /**
     * Revoke a previously submitted feedback. Only the original submitter can revoke.
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback storage fb = _feedbacks[agentId][msg.sender][feedbackIndex];
        require(!fb.isRevoked, "Already revoked");
        fb.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * Aggregate reputation score for an agent across all clients and all tags.
     * @return totalScore   Sum of all non-revoked feedback values.
     * @return feedbackCount Number of non-revoked feedback entries.
     */
    function getSummary(uint256 agentId) external view returns (int128 totalScore, uint256 feedbackCount) {
        address[] memory clients = _clients[agentId];
        for (uint256 i = 0; i < clients.length; i++) {
            Feedback[] memory fbs = _feedbacks[agentId][clients[i]];
            for (uint256 j = 0; j < fbs.length; j++) {
                if (!fbs[j].isRevoked) {
                    totalScore += fbs[j].value;
                    feedbackCount++;
                }
            }
        }
    }

    /**
     * Read a single feedback entry.
     */
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (Feedback memory) {
        return _feedbacks[agentId][clientAddress][feedbackIndex];
    }

    /**
     * Get all clients who have given feedback to an agent.
     */
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /**
     * Get the count of feedback entries from a specific client for an agent.
     */
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint256) {
        return _feedbacks[agentId][clientAddress].length;
    }
}
