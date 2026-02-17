# EIP-8004 (ERC-8004: Trustless Agents) Integration

## Overview
EIP-8004 defines three on-chain registries for AI agent identity, reputation, and validation.
We'll integrate these into the PokerVault poker tournament app so agents can have persistent
identities and build reputation across tournaments.

## Plan

### Contracts (packages/hardhat/contracts/)

- [ ] 1. `AgentIdentityRegistry.sol` — ERC-721 based registry
  - `register(string agentURI)` — mint agent NFT with a metadata URI
  - `setAgentURI(uint256 agentId, string newURI)` — update URI
  - `setAgentWallet(uint256 agentId, address wallet)` — set payment wallet
  - Events: `Registered`, `URIUpdated`
  - Inherits ERC-721, Ownable

- [ ] 2. `AgentReputationRegistry.sol` — feedback/reputation tracker
  - Links to IdentityRegistry
  - `giveFeedback(uint256 agentId, int128 value, string tag)` — post tournament result
  - `revokeFeedback(uint256 agentId, uint64 feedbackIndex)` — withdraw feedback
  - `getSummary(uint256 agentId)` — aggregate score
  - Events: `NewFeedback`, `FeedbackRevoked`

- [ ] 3. Update `PokerVault.sol`
  - Add optional `agentId` field to the `Agent` struct (0 = unregistered)
  - Update `enterTournament` to accept optional `agentId` param
  - In `settleTournament`, post reputation feedback to ReputationRegistry if set
  - Add `setReputationRegistry(address)` admin function

### Deploy (packages/hardhat/deploy/)

- [ ] 4. `01_deploy_identity_registry.ts` — deploy IdentityRegistry
- [ ] 5. `02_deploy_reputation_registry.ts` — deploy ReputationRegistry (linked to Identity)
- [ ] 6. Update `00_deploy_your_contract.ts` to wire PokerVault to ReputationRegistry

### Betting (packages/hardhat/contracts/)

- [ ] 7. `TournamentBetting.sol` — parimutuel betting pool per tournament
  - References PokerVault to read tournament state (status, agents, seat count)
  - `placeBet(uint256 tournamentId, uint256 seatIndex)` payable — bet on a specific agent seat
    - Only allowed while tournament status is Open
    - Min bet enforced (e.g. 0.01 MON), no max
    - Tracks: `bets[tournamentId][seatIndex][bettor] = amount` and per-seat totals
  - `claimWinnings(uint256 tournamentId)` — after settlement, bettors who picked the winner
    share the total betting pool proportional to their stake (minus platform fee)
  - `settleBetting(uint256 tournamentId, uint256 winningSeat)` — called by operator after
    PokerVault.settleTournament; records the winning seat so claimWinnings can proceed
  - `getBettingPool(uint256 tournamentId)` view — total pool and per-seat totals
  - `getOdds(uint256 tournamentId, uint256 seatIndex)` view — implied odds (seat pool / total pool)
  - Platform fee: configurable % taken from total pool before payout, sent to owner
  - Events: `BetPlaced`, `BettingSettled`, `WinningsClaimed`

- [ ] 8. `03_deploy_betting.ts` — deploy TournamentBetting (linked to PokerVault)

### Out of scope
- ValidationRegistry (no clear use case in a poker game, adds complexity)
- Frontend UI changes (scope is contracts only)

### Key design decisions
- **Parimutuel (pool-based) odds** — no fixed odds bookmaker needed; winners split the loser pool,
  which is fair and simple on-chain
- **Separate contract** — keeps PokerVault unchanged except for the ERC-8004 wiring; betting is
  fully opt-in and standalone
- **Bets locked at tournament start** — once operator calls startTournament, no new bets accepted
- **Claim model** — winners pull their winnings rather than auto-push, avoiding failed-send issues

## Review

All 8 tasks completed. Here's a summary:

### Contracts (4 files)
- `AgentIdentityRegistry.sol` — ERC-721 registry where agents mint a persistent on-chain identity (tokenURI resolves to ERC-8004 metadata JSON). Owners can update their URI and set a separate payment wallet.
- `AgentReputationRegistry.sol` — Tracks signed feedback scores per agentId from any third-party caller. PokerVault uses this to post +1 (win) / -1 (loss) after each settlement. Scores are aggregatable on-chain.
- `PokerVault.sol` (updated) — Agent struct now includes optional `agentId` field (0 = ephemeral). `enterTournament` takes a 4th param `agentId`. `settleTournament` auto-posts reputation feedback for all registered agents via `IAgentReputationRegistry`. Failures are silently caught so settlement is never blocked.
- `TournamentBetting.sol` — Parimutuel spectator betting. Bets accepted while tournament is Open; locked on start. After PokerVault settles, operator calls `settleBetting(winningSeat)` which deducts platform fee and pays it to owner. Winners call `claimWinnings()` to pull their share proportional to stake.

### Deploy scripts (3 new files)
- `01_deploy_identity_registry.ts` — deploys AgentIdentityRegistry
- `02_deploy_reputation_registry.ts` — deploys AgentReputationRegistry and wires it to PokerVault via `setReputationRegistry()`
- `03_deploy_betting.ts` — deploys TournamentBetting linked to PokerVault

### Frontend (6 files changed/created)
- `hooks/useBetting.ts` — hooks: `useBettingPool`, `useWinningSeat`, `useUserBets`, `useHasClaimed`
- `components/poker/BettingPanel.tsx` — full betting UI: odds table, bet placement form, operator settle button, claim winnings button
- `components/poker/EnterAgentModal.tsx` — added optional ERC-8004 Agent ID field; passes `agentId` to updated contract
- `app/tournaments/[id]/page.tsx` — added `<BettingPanel>` section between agent roster and game feed
- `components/poker/TournamentCard.tsx` — shows live betting pool badge when > 0
- `components/poker/AgentRoster.tsx` — shows ERC-8004 ID column with badge for registered agents
