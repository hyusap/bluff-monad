# Deployment Guide

This guide covers deploying:

1. Smart contracts to Monad testnet (`monadTestnet`)
2. Next.js frontend to Vercel

## 1. Prerequisites

- Node `>=20.18.3`
- Yarn `3.2.3` (via Corepack)
- A funded Monad testnet wallet for contract deployment
- Optional but recommended:
  - `NEXT_PUBLIC_ALCHEMY_API_KEY`
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

From repo root:

```bash
yarn install
```

## 2. Configure Environment Variables

### Hardhat env (`packages/hardhat/.env`)

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

Set API keys in `packages/hardhat/.env`:

```bash
ALCHEMY_API_KEY=...
ETHERSCAN_MAINNET_API_KEY=...
```

Create or import deployer key (writes `DEPLOYER_PRIVATE_KEY_ENCRYPTED`):

```bash
yarn account:generate
# or
yarn account:import
```

### Next.js env (`packages/nextjs/.env.local`)

```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Set:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

## 3. Deploy Contracts to Monad Testnet

Check deployer wallet and balance:

```bash
yarn account
```

Deploy:

```bash
yarn deploy --network monadTestnet
```

Notes:

- You will be prompted for the password used to encrypt `DEPLOYER_PRIVATE_KEY_ENCRYPTED`.
- Deployment artifacts are written to `packages/hardhat/deployments/monadTestnet`.
- The frontend contract map is auto-generated at `packages/nextjs/contracts/deployedContracts.ts`.

## 4. Verify Contracts

Recommended command:

```bash
yarn hardhat:hardhat-verify --network monadTestnet <CONTRACT_ADDRESS>
```

You can also use:

```bash
yarn verify
```

This runs `packages/hardhat/scripts/verifyContract.ts` and attempts verification from the latest deployment artifact.

## 5. Deploy Frontend to Vercel

From repo root:

```bash
yarn vercel:login
yarn vercel
```

For production deployment:

```bash
yarn vercel --prod
```

Set these Vercel project env vars before production deploy:

- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `GAME_ENGINE_URL` (optional; only if you run an external game engine API)

## 6. Deploy Game Engine (Docker, Monad Testnet)

Build:

```bash
docker build -t bluff-game-engine:testnet .
```

Run:

```bash
docker run --rm -p 3001:3001 \
  -e DEPLOYER_PRIVATE_KEY=0x... \
  -e GAME_ENGINE_DEPLOYMENT_NETWORK=monadTestnet \
  bluff-game-engine:testnet
```

Or with Docker Compose:

```bash
export DEPLOYER_PRIVATE_KEY=0x...
docker compose up -d --build
```

Notes:

- The engine listens on port `3001`.
- `DEPLOYER_PRIVATE_KEY` must be funded on Monad testnet and authorized as operator if required by your contracts.
- The image runs `yarn run-game:testnet`, which uses `--network monadTestnet`.

## 7. Post-Deploy Checklist

1. Open deployed app URL and connect wallet.
2. Switch to Monad testnet in wallet.
3. Confirm contracts appear and reads succeed.
4. If tournament feed is needed, ensure `GAME_ENGINE_URL` points to a reachable API.
