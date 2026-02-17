// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentReputationRegistry {
    function giveFeedback(uint256 agentId, int128 value, string calldata tag) external returns (uint64);
}

/**
 * PokerVault — escrow for agentic poker tournaments.
 *
 * Agents are ephemeral by default: they exist only within a tournament and are defined
 * by a name + system prompt submitted at entry time. Optionally, agents may link
 * a persistent ERC-8004 identity (agentId > 0) to build on-chain reputation.
 *
 * Responsibilities:
 *   - Accept buy-ins in MON (native token) when agents enter tournaments
 *   - Hold prize pools while games run
 *   - Pay out the full prize pool to the winner's wallet
 *   - Post win/loss feedback to the ERC-8004 Reputation Registry (if configured)
 *
 * Game logic (cards, betting, hand evaluation) is entirely off-chain.
 * The operator (agent-runner service) is trusted to report the winner.
 */
contract PokerVault is Ownable {

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    struct Agent {
        address wallet;       // wallet that entered; receives winnings if they win
        string  name;
        string  systemPrompt;
        uint256 agentId;      // ERC-8004 identity token ID (0 = ephemeral, unregistered)
    }

    enum TournamentStatus { Open, Running, Finished }

    struct Tournament {
        uint256 buyIn;
        uint256 prizePool;
        TournamentStatus status;
        uint8   maxPlayers;
        address creator;
        Agent[] agents;
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    address public operator;

    uint256 public nextTournamentId = 1;
    uint256 public activeTournamentId;

    mapping(uint256 => Tournament) public tournaments;

    // ERC-8004 Reputation Registry — optional, address(0) means disabled
    IAgentReputationRegistry public reputationRegistry;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event TournamentCreated(uint256 indexed tournamentId, uint256 buyIn, uint8 maxPlayers);
    event AgentEntered(uint256 indexed tournamentId, uint256 indexed seatIndex, address indexed wallet, string name, uint256 agentId);
    event TournamentStarted(uint256 indexed tournamentId, uint256 playerCount);
    event TournamentSettled(uint256 indexed tournamentId, uint256 indexed winningSeat, address indexed winner, uint256 payout);

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────

    modifier onlyOperator() {
        require(msg.sender == operator, "Not the operator");
        _;
    }

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address _operator) Ownable(msg.sender) {
        operator = _operator;
    }

    // ─────────────────────────────────────────────
    // Tournament management
    // ─────────────────────────────────────────────

    /**
     * Create a new tournament. Only the operator can create one.
     * @param buyIn      Amount in wei each agent must send to enter (0 = free).
     * @param maxPlayers Maximum number of agents allowed.
     */
    function createTournament(uint256 buyIn, uint8 maxPlayers) external onlyOperator returns (uint256 tournamentId) {
        require(maxPlayers >= 2, "Need at least 2 players");
        require(activeTournamentId == 0, "Active tournament exists");
        tournamentId = nextTournamentId++;
        tournaments[tournamentId].buyIn      = buyIn;
        tournaments[tournamentId].maxPlayers = maxPlayers;
        tournaments[tournamentId].status     = TournamentStatus.Open;
        tournaments[tournamentId].creator    = msg.sender;
        activeTournamentId = tournamentId;
        emit TournamentCreated(tournamentId, buyIn, maxPlayers);
    }

    /**
     * Enter a tournament with a new agent. Must send exactly the buy-in in MON.
     * @param tournamentId Tournament to enter.
     * @param name         Display name for the agent.
     * @param systemPrompt The AI system prompt that drives this agent's decisions.
     * @param agentId      ERC-8004 identity token ID to link (0 = ephemeral).
     */
    function enterTournament(
        uint256 tournamentId,
        string calldata name,
        string calldata systemPrompt,
        uint256 agentId
    ) external payable returns (uint256 seatIndex) {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Open, "Tournament not open");
        require(t.agents.length < t.maxPlayers, "Tournament full");
        require(bytes(name).length > 0, "Name required");
        require(msg.value == t.buyIn, "Wrong buy-in amount");

        seatIndex = t.agents.length;
        t.agents.push(Agent({ wallet: msg.sender, name: name, systemPrompt: systemPrompt, agentId: agentId }));
        t.prizePool += msg.value;

        emit AgentEntered(tournamentId, seatIndex, msg.sender, name, agentId);
    }

    /**
     * Start a tournament. The tournament creator OR the operator can call this.
     * Emits TournamentStarted so the agent-runner can read agent data and begin the game.
     */
    function startTournament(uint256 tournamentId) external {
        Tournament storage t = tournaments[tournamentId];
        require(msg.sender == t.creator || msg.sender == operator, "Not creator or operator");
        require(t.status == TournamentStatus.Open, "Tournament not open");
        require(t.agents.length >= 4, "Need at least 4 players");
        t.status = TournamentStatus.Running;
        emit TournamentStarted(tournamentId, t.agents.length);
    }

    /**
     * Settle a finished tournament. Only the operator can call this.
     * Transfers the full prize pool to the winning agent's wallet.
     * If the ERC-8004 Reputation Registry is configured, posts win/loss feedback
     * for all agents that have a registered identity (agentId > 0).
     * @param tournamentId Tournament being settled.
     * @param winningSeat  Seat index (0-based) of the winning agent.
     */
    function settleTournament(uint256 tournamentId, uint256 winningSeat) external onlyOperator {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Running, "Tournament not running");
        require(winningSeat < t.agents.length, "Invalid seat");

        t.status = TournamentStatus.Finished;

        address winner = t.agents[winningSeat].wallet;
        uint256 payout = t.prizePool;
        t.prizePool = 0;

        emit TournamentSettled(tournamentId, winningSeat, winner, payout);
        if (activeTournamentId == tournamentId) {
            activeTournamentId = 0;
        }

        // Post ERC-8004 reputation feedback for all registered agents
        if (address(reputationRegistry) != address(0)) {
            for (uint256 i = 0; i < t.agents.length; i++) {
                uint256 aid = t.agents[i].agentId;
                if (aid > 0) {
                    int128 score = (i == winningSeat) ? int128(1) : int128(-1);
                    // Ignore failures so settlement never gets blocked
                    try reputationRegistry.giveFeedback(aid, score, "poker-tournament") {} catch {}
                }
            }
        }

        (bool success, ) = winner.call{ value: payout }("");
        require(success, "Payout failed");
    }

    // ─────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────

    function getTournamentCreator(uint256 tournamentId) external view returns (address) {
        return tournaments[tournamentId].creator;
    }

    function getTournamentAgents(uint256 tournamentId) external view returns (Agent[] memory) {
        return tournaments[tournamentId].agents;
    }

    function getTournamentAgent(uint256 tournamentId, uint256 seatIndex) external view returns (Agent memory) {
        return tournaments[tournamentId].agents[seatIndex];
    }

    function getAgentCount(uint256 tournamentId) external view returns (uint256) {
        return tournaments[tournamentId].agents.length;
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    /**
     * Wire in the ERC-8004 Reputation Registry. Pass address(0) to disable.
     */
    function setReputationRegistry(address _registry) external onlyOwner {
        reputationRegistry = IAgentReputationRegistry(_registry);
    }

    receive() external payable {}
}
