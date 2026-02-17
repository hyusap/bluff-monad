FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy Yarn metadata and workspace manifests for dependency installation.
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/hardhat/package.json packages/hardhat/package.json
COPY packages/nextjs/package.json packages/nextjs/package.json

RUN yarn install --immutable

# Copy source after dependency install for better layer caching.
COPY . .

ENV NODE_ENV=production
ENV GAME_ENGINE_PORT=3001
ENV GAME_ENGINE_DEPLOYMENT_NETWORK=monadTestnet

EXPOSE 3001

CMD ["yarn", "run-game:testnet"]
