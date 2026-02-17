# Fix Spectator Betting, Verify EIP-8004, Add Leaderboard

## Problems Found

### 1. CRITICAL BUG: Spectator betting allows claiming before game starts
**Root cause:** In `TournamentBetting.sol`, the `_winningSeat` mapping defaults to `0` (Solidity default for `int256`), NOT `-1`. This means:
- `claimWinnings()` checks `ws >= 0` — passes immediately since default is `0`
- `settleBetting()` checks `_winningSeat == -1` — fails with "Already settled" since default is `0`
- The UI reads `getWinningSeat()` which returns `0`, and `isSettled = winSeat >= 0` is `true`

**Result:** Any spectator who bet on seat 0 can claim winnings before the game even starts. Settlement can never work.

**Fix:** Initialize `_winningSeat` to `-1` when the first bet is placed (or use a separate `_isSettled` bool). Simplest: use a `_settled` mapping and keep winning seat separate.

### 2. EIP-8004 Implementation Review
- `AgentIdentityRegistry.sol` — Looks correct: ERC-721 NFT for agent identity, register/update/wallet functions
- `AgentReputationRegistry.sol` — Looks correct: feedback tracking with getSummary()
- `PokerVault.sol` — Integration looks correct: posts +1/-1 feedback after settlement for agents with agentId > 0
- **Issue:** No frontend leaderboard page exists. Agents can persist but there's no way to view rankings.

### 3. Missing Leaderboard
No leaderboard page or component exists in the frontend. Need to add one that queries `AgentReputationRegistry.getSummary()` for all registered agents.

## Tasks

- [x] Fix `_winningSeat` default value bug in `TournamentBetting.sol` (use a separate `_settled` mapping)
- [x] Fix `BettingPanel.tsx` to correctly check settlement status (no changes needed — frontend logic was already correct, bug was in contract)
- [x] Add a leaderboard page that shows agent rankings from the reputation registry
- [x] Redeploy contracts (since contract changed)
- [x] Add review section

## Review

### Changes Made

**1. `packages/hardhat/contracts/TournamentBetting.sol`** — Fixed critical betting bug
- Added `_settled` mapping (bool) to explicitly track whether betting is settled
- Changed `_winningSeat` from `int256` to `uint256` (no longer needs sentinel value)
- `settleBetting()` now checks `!_settled[tournamentId]` instead of `_winningSeat == -1`
- `claimWinnings()` now checks `_settled[tournamentId]` instead of `ws >= 0`
- `getWinningSeat()` returns `-1` when `_settled` is false, otherwise the actual seat

**2. `packages/nextjs/app/leaderboard/page.tsx`** — New leaderboard page
- Reads all registered agents from `AgentIdentityRegistry.nextAgentId`
- For each agent, queries `AgentReputationRegistry.getSummary()` for score/game count
- Displays agent ID, owner, URI, total score, wins, losses, and games played
- Follows existing dark theme styling conventions

**3. `packages/nextjs/components/Header.tsx`** — Added nav link
- Added "Leaderboard" link to the header navigation menu

### EIP-8004 Verification
- `AgentIdentityRegistry.sol` — Correctly implements ERC-721 based agent identity with register/setURI/setWallet
- `AgentReputationRegistry.sol` — Correctly tracks per-agent feedback with getSummary aggregation
- `PokerVault.sol` — Correctly posts +1/-1 feedback after tournament settlement for agents with `agentId > 0`
- Agents persist across games via their NFT identity and accumulate reputation
