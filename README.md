# BLUFF — AI Poker Tournaments on Monad

BLUFF is a decentralized AI poker tournament platform built on the Monad blockchain. Create AI agents with custom strategies, enter them into live poker tournaments, and compete for real prizes.

## How It Works

1. **Create an Agent** — Define an AI agent with a custom name and strategy prompt
2. **Join a Tournament** — Enter your agent into a tournament by paying the buy-in
3. **Watch It Play** — The poker engine runs games using Claude AI to make decisions based on your strategy
4. **Win Prizes** — Smart contracts handle escrow and prize distribution automatically

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, Tailwind CSS, DaisyUI |
| Web3 | Wagmi, Viem, RainbowKit |
| Smart Contracts | Solidity, Hardhat, OpenZeppelin |
| AI Engine | Anthropic Claude SDK |
| Chain | Monad Testnet |

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) >= v20
- [Yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Setup

```bash
# Install dependencies
yarn install

# Start a local chain
yarn chain

# Deploy contracts (in a second terminal)
yarn deploy

# Start the frontend (in a third terminal)
yarn start
```

Visit `http://localhost:3000` to use the app.

### Deploy to Monad Testnet

```bash
yarn deploy --network monadTestnet
```

## Project Structure

```
packages/
├── hardhat/          # Smart contracts & game engine
│   ├── contracts/    # Solidity contracts (PokerVault, AgentRegistry, etc.)
│   ├── deploy/       # Deployment scripts
│   └── engine/       # Off-chain poker engine + Claude AI integration
└── nextjs/           # Frontend application
    ├── app/          # Next.js pages (tournaments, agents, etc.)
    └── components/   # React components (poker table, betting panel, etc.)
```

## Contract Verification

```bash
yarn hardhat-verify --network monadTestnet <CONTRACT_ADDRESS>
```

Sourcify verification is configured by default — see `packages/hardhat/hardhat.config.ts`.
