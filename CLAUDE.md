# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **Yarn 3** (via Corepack). Always use `yarn` — never `npm` or `npx`.

Node.js >= 20.18.3 required.

## Commands

### Root-Level
```bash
yarn chain          # Start local Hardhat node
yarn deploy         # Deploy contracts to localhost
yarn start          # Start Next.js dev server
yarn test           # Run Hardhat contract tests
yarn lint           # Lint both packages
yarn format         # Format both packages
```

### Hardhat (Smart Contracts & Game Engine)
```bash
yarn hardhat:compile     # Compile Solidity contracts
yarn hardhat:test        # Run contract tests
yarn run-game            # Run poker game locally
yarn run-game:testnet    # Run game on Monad testnet
yarn hardhat:deploy --network monadTestnet   # Deploy to testnet
yarn hardhat:hardhat-verify --network monadTestnet <ADDRESS>
```

### Next.js (Frontend)
```bash
yarn next:dev        # Dev server
yarn next:build      # Production build
yarn next:lint       # Lint frontend
```

## Architecture

**BLUFF** is a decentralized AI poker tournament platform on Monad blockchain. Monorepo with two packages:

### `packages/hardhat/` — Contracts + Off-Chain Game Engine
- **Smart Contracts** (Solidity 0.8.20):
  - `PokerVault.sol` — Core contract: tournament creation, buy-in escrow, payout, agent storage
  - `AgentIdentityRegistry.sol` — ERC-721 agent identity tokens
  - `AgentReputationRegistry.sol` — ERC-8004 reputation/feedback tracking
  - `TournamentBetting.sol` — Betting mechanics
- **Off-Chain Poker Engine** (`scripts/` and top-level TS files):
  - `pokerGame.ts` — Game loop orchestration
  - `claudeAgent.ts` — Claude AI integration for agent decisions (`@ai-sdk/anthropic`)
  - `gameState.ts`, `handEvaluator.ts`, `deck.ts`, `types.ts` — Core engine
  - `scripts/runGame.ts` — Entry point for game execution

### `packages/nextjs/` — Frontend
- Next.js 15 + React 19, TypeScript, Tailwind CSS 4 + DaisyUI
- Wagmi v2 + Viem + RainbowKit for Web3
- Key hooks: `useTournaments.ts`, `useAgents.ts`, `useBetting.ts`, `useGameFeed.ts`
- Scaffold-ETH 2 hooks in `hooks/scaffold-eth/` wrap Wagmi for contract reads/writes
- `scaffold.config.ts` — Target network (`monadTestnet`), polling interval (4s), wallet config

### Data Flow
1. User creates AI agent with strategy prompt → stored in `PokerVault`
2. Agent enters tournament by paying buy-in → escrow held in `PokerVault`
3. Off-chain engine runs game, calling Claude API for each agent decision
4. Engine posts winner on-chain → prize pool released via `PokerVault.finishTournament()`
5. Frontend polls contract state via Wagmi hooks (2s interval)

### Key Integration Points
- Frontend reads contract state via `useScaffoldReadContract` / `useScaffoldWriteContract` hooks
- TypeChain generates typed contract bindings from ABIs after deployment
- Deployed contract addresses are auto-written to `packages/nextjs/contracts/deployedContracts.ts`
- Game engine authenticates with Claude API via `ANTHROPIC_API_KEY` env var

## Networks
- **Local dev**: Hardhat node (port 8545)
- **Testnet**: Monad testnet (chainId: 10143, RPC: `https://testnet-rpc.monad.xyz/`)

## Environment Variables
- `packages/hardhat/.env`: `DEPLOYER_PRIVATE_KEY`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`, `ANTHROPIC_API_KEY`
- `packages/nextjs/.env.local`: `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

## Docker (Game Engine)
The off-chain poker engine can be containerized:
```bash
docker-compose up   # Runs game engine on port 3001
```
Key env vars: `GAME_ENGINE_DEPLOYMENT_NETWORK`, `DEPLOYER_PRIVATE_KEY`, `POKER_DEFAULT_BUY_IN`, `POKER_DEFAULT_AGENT_COUNT`, `POKER_MIN_PLAYERS_TO_START`

## Pre-commit Hooks
Husky runs lint-staged on commit:
- `packages/nextjs/**/*.{ts,tsx}` → Next.js lint + tsc type-check
- `packages/hardhat/**/*.{ts,tsx}` → ESLint
