// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * PokerVault — escrow for agentic poker tournaments.
 *
 * Agents are ephemeral: they exist only within a tournament and are defined
 * by a name + system prompt submitted at entry time. No persistent registry.
 *
 * Responsibilities:
 *   - Accept buy-ins in MON (native token) when agents enter tournaments
 *   - Hold prize pools while games run
 *   - Pay out the full prize pool to the winner's wallet
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

    mapping(uint256 => Tournament) public tournaments;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event TournamentCreated(uint256 indexed tournamentId, uint256 buyIn, uint8 maxPlayers);
    event AgentEntered(uint256 indexed tournamentId, uint256 indexed seatIndex, address indexed wallet, string name);
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
     * Create a new tournament. Anyone can create one.
     * @param buyIn      Amount in wei each agent must send to enter (0 = free).
     * @param maxPlayers Maximum number of agents allowed.
     */
    function createTournament(uint256 buyIn, uint8 maxPlayers) external returns (uint256 tournamentId) {
        require(maxPlayers >= 2, "Need at least 2 players");
        tournamentId = nextTournamentId++;
        tournaments[tournamentId].buyIn      = buyIn;
        tournaments[tournamentId].maxPlayers = maxPlayers;
        tournaments[tournamentId].status     = TournamentStatus.Open;
        tournaments[tournamentId].creator    = msg.sender;
        emit TournamentCreated(tournamentId, buyIn, maxPlayers);
    }

    /**
     * Enter a tournament with a new agent. Must send exactly the buy-in in MON.
     * The agent only exists for the duration of this tournament.
     * @param tournamentId Tournament to enter.
     * @param name         Display name for the agent.
     * @param systemPrompt The AI system prompt that drives this agent's decisions.
     */
    function enterTournament(
        uint256 tournamentId,
        string calldata name,
        string calldata systemPrompt
    ) external payable returns (uint256 seatIndex) {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Open, "Tournament not open");
        require(t.agents.length < t.maxPlayers, "Tournament full");
        require(bytes(name).length > 0, "Name required");
        require(msg.value == t.buyIn, "Wrong buy-in amount");

        seatIndex = t.agents.length;
        t.agents.push(Agent({ wallet: msg.sender, name: name, systemPrompt: systemPrompt }));
        t.prizePool += msg.value;

        emit AgentEntered(tournamentId, seatIndex, msg.sender, name);
    }

    /**
     * Start a tournament. The tournament creator OR the operator can call this.
     * Emits TournamentStarted so the agent-runner can read agent data and begin the game.
     */
    function startTournament(uint256 tournamentId) external {
        Tournament storage t = tournaments[tournamentId];
        require(msg.sender == t.creator || msg.sender == operator, "Not creator or operator");
        require(t.status == TournamentStatus.Open, "Tournament not open");
        require(t.agents.length >= 2, "Not enough players");
        t.status = TournamentStatus.Running;
        emit TournamentStarted(tournamentId, t.agents.length);
    }

    /**
     * Settle a finished tournament. Only the operator can call this.
     * Transfers the full prize pool to the winning agent's wallet.
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

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    receive() external payable {}
}
