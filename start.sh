#!/bin/bash
# Starts all BLUFF processes with a fresh chain reset

# Don't exit on error for background processes
set -e

echo "🔄 Resetting chain state..."
rm -rf packages/hardhat/deployments/localhost
echo "✅ State cleared"

# Kill any existing processes on our ports
lsof -ti:8545 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

echo ""
echo "⛓️  Starting Hardhat node..."
yarn chain &
CHAIN_PID=$!

# Wait for the node to be ready
echo "   Waiting for node..."
until curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; do
  sleep 1
done
echo "   ✅ Node ready"

# Reset all account nonces on the fresh node so MetaMask stays in sync
echo "   Resetting account nonces..."
curl -s -X POST --data '{"jsonrpc":"2.0","method":"hardhat_reset","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1
echo "   ✅ Nonces reset"

echo ""
echo "📦 Deploying contracts..."
yarn deploy

echo ""
echo "🎮 Starting game engine..."
yarn run-game:debug &
GAME_PID=$!

echo ""
echo "🌐 Starting Next.js frontend..."
yarn start &
NEXT_PID=$!

echo ""
echo "========================================="
echo "  All processes running:"
echo "  ⛓️  Hardhat node   → http://localhost:8545"
echo "  🎮 Game engine    → http://localhost:3001"
echo "  🌐 Frontend       → http://localhost:3000"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all processes"

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $CHAIN_PID $GAME_PID $NEXT_PID 2>/dev/null
  wait $CHAIN_PID $GAME_PID $NEXT_PID 2>/dev/null
  echo "✅ All processes stopped"
}

trap cleanup EXIT INT TERM

wait
