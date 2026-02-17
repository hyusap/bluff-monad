// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IPokerVault {
    function tournaments(uint256 tournamentId) external view returns (
        uint256 buyIn,
        uint256 prizePool,
        uint8   status,
        uint8   maxPlayers,
        address creator
    );
}

/**
 * TournamentBetting — parimutuel betting pool for PokerVault tournaments.
 *
 * Spectators can bet MON on which agent seat they think will win while
 * the tournament is Open. Once settled, winners share the total pool
 * proportionally to their stake (minus a small platform fee).
 *
 * Betting lifecycle:
 *   1. placeBet()       — while tournament is Open
 *   2. (tournament runs)
 *   3. settleBetting()  — operator calls after PokerVault.settleTournament()
 *   4. claimWinnings()  — winners pull their share
 */
contract TournamentBetting is Ownable {

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    IPokerVault public immutable pokerVault;

    address public operator;

    // Platform fee in basis points (100 bps = 1%). Default 5%.
    uint256 public platformFeeBps = 500;

    uint256 public constant MIN_BET = 0.001 ether;

    // tournamentId => seatIndex => bettor => bet amount
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public bets;

    // tournamentId => seatIndex => total amount bet on that seat
    mapping(uint256 => mapping(uint256 => uint256)) public seatTotals;

    // tournamentId => total amount in the betting pool
    mapping(uint256 => uint256) public totalPool;

    // tournamentId => winning seat (-1 = not settled yet)
    mapping(uint256 => int256) private _winningSeat;

    // tournamentId => payout pool (totalPool minus platform fee, set on settlement)
    mapping(uint256 => uint256) private _payoutPool;

    // tournamentId => bettor => has claimed winnings
    mapping(uint256 => mapping(address => bool)) public claimed;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event BetPlaced(
        uint256 indexed tournamentId,
        uint256 indexed seatIndex,
        address indexed bettor,
        uint256 amount
    );
    event BettingSettled(
        uint256 indexed tournamentId,
        uint256 indexed winningSeat,
        uint256 totalPool,
        uint256 platformFee
    );
    event WinningsClaimed(
        uint256 indexed tournamentId,
        address indexed bettor,
        uint256 amount
    );

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address _pokerVault, address _operator) Ownable(msg.sender) {
        pokerVault = IPokerVault(_pokerVault);
        operator = _operator;
    }

    // ─────────────────────────────────────────────
    // Betting
    // ─────────────────────────────────────────────

    /**
     * Place a bet on an agent seat. Only allowed while the tournament is Open.
     * Multiple bets on the same seat accumulate; betting different seats is allowed.
     * @param tournamentId The PokerVault tournament ID.
     * @param seatIndex    The 0-based agent seat to bet on.
     */
    function placeBet(uint256 tournamentId, uint256 seatIndex) external payable {
        require(msg.value >= MIN_BET, "Bet below minimum");

        (, , uint8 status, uint8 maxPlayers, ) = pokerVault.tournaments(tournamentId);
        require(status == 0, "Betting closed (tournament not open)");
        require(seatIndex < maxPlayers, "Seat out of range");

        bets[tournamentId][seatIndex][msg.sender] += msg.value;
        seatTotals[tournamentId][seatIndex] += msg.value;
        totalPool[tournamentId] += msg.value;

        emit BetPlaced(tournamentId, seatIndex, msg.sender, msg.value);
    }

    /**
     * Settle betting for a finished tournament. Only the operator can call this.
     * Must be called after PokerVault.settleTournament() so status == Finished.
     * Deducts the platform fee and transfers it to the contract owner.
     * @param tournamentId The tournament ID.
     * @param winningSeat  The winning seat (must match PokerVault result).
     */
    function settleBetting(uint256 tournamentId, uint256 winningSeat) external {
        require(msg.sender == operator, "Not operator");

        (, , uint8 status, , ) = pokerVault.tournaments(tournamentId);
        require(status == 2, "Tournament not finished");
        require(_winningSeat[tournamentId] == -1, "Already settled");

        _winningSeat[tournamentId] = int256(winningSeat);

        uint256 pool = totalPool[tournamentId];

        if (pool == 0) {
            emit BettingSettled(tournamentId, winningSeat, 0, 0);
            return;
        }

        // If no bets on the winning seat, send the whole pool to the owner (edge case)
        if (seatTotals[tournamentId][winningSeat] == 0) {
            (bool ok, ) = owner().call{ value: pool }("");
            require(ok, "Fee transfer failed");
            emit BettingSettled(tournamentId, winningSeat, pool, pool);
            return;
        }

        uint256 fee = (pool * platformFeeBps) / 10000;
        if (fee > 0) {
            (bool ok, ) = owner().call{ value: fee }("");
            require(ok, "Fee transfer failed");
        }

        _payoutPool[tournamentId] = pool - fee;

        emit BettingSettled(tournamentId, winningSeat, pool, fee);
    }

    /**
     * Claim winnings after betting is settled. Pull-pattern to avoid failed sends.
     * Winners share the payout pool proportional to their stake on the winning seat.
     */
    function claimWinnings(uint256 tournamentId) external {
        int256 ws = _winningSeat[tournamentId];
        require(ws >= 0, "Betting not settled yet");
        uint256 winningSeat = uint256(ws);

        require(!claimed[tournamentId][msg.sender], "Already claimed");

        uint256 userBet = bets[tournamentId][winningSeat][msg.sender];
        require(userBet > 0, "No winning bet");

        claimed[tournamentId][msg.sender] = true;

        uint256 payoutPool = _payoutPool[tournamentId];
        uint256 seatPool = seatTotals[tournamentId][winningSeat];
        uint256 payout = (userBet * payoutPool) / seatPool;

        emit WinningsClaimed(tournamentId, msg.sender, payout);

        (bool success, ) = msg.sender.call{ value: payout }("");
        require(success, "Transfer failed");
    }

    // ─────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────

    /**
     * Get the total pool and per-seat totals for a tournament.
     */
    function getBettingPool(uint256 tournamentId)
        external
        view
        returns (uint256 total, uint256[] memory seatAmounts)
    {
        (, , , uint8 maxPlayers, ) = pokerVault.tournaments(tournamentId);
        total = totalPool[tournamentId];
        seatAmounts = new uint256[](maxPlayers);
        for (uint256 i = 0; i < maxPlayers; i++) {
            seatAmounts[i] = seatTotals[tournamentId][i];
        }
    }

    /**
     * Returns the winning seat for a settled tournament, or -1 if not yet settled.
     */
    function getWinningSeat(uint256 tournamentId) external view returns (int256) {
        return _winningSeat[tournamentId];
    }

    /**
     * Returns this bettor's bet amounts on each seat.
     */
    function getUserBets(uint256 tournamentId, address bettor)
        external
        view
        returns (uint256[] memory amounts)
    {
        (, , , uint8 maxPlayers, ) = pokerVault.tournaments(tournamentId);
        amounts = new uint256[](maxPlayers);
        for (uint256 i = 0; i < maxPlayers; i++) {
            amounts[i] = bets[tournamentId][i][bettor];
        }
    }

    /**
     * Returns the payout pool (after platform fee) for a settled tournament.
     */
    function getPayoutPool(uint256 tournamentId) external view returns (uint256) {
        return _payoutPool[tournamentId];
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2000, "Fee too high"); // max 20%
        platformFeeBps = _feeBps;
    }
}
