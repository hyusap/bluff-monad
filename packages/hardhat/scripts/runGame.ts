import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { runPokerGame } from "../engine/pokerGame";
import { getEvents } from "../engine/eventLogger";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

// Create HTTP server for game events API
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Match /api/game/:id
  const match = req.url?.match(/^\/api\/game\/(\d+)$/);
  if (match && req.method === "GET") {
    const tournamentId = parseInt(match[1], 10);
    const events = getEvents(tournamentId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ events }));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const API_PORT = process.env.GAME_ENGINE_PORT || 3001;
server.listen(API_PORT, () => {
  console.log(`📡 Game API listening on http://localhost:${API_PORT}`);
});

function parseStartingStack(): number | undefined {
  const raw = process.env.POKER_STARTING_STACK;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("POKER_STARTING_STACK must be a positive number.");
  }
  return Math.floor(parsed);
}

async function main() {
  const [operator] = await ethers.getSigners();
  const debugMode = ["1", "true", "yes", "on"].includes((process.env.POKER_DEBUG_MODE || "").toLowerCase());
  const explicitStartingStack = parseStartingStack();
  const startingStack = explicitStartingStack ?? (debugMode ? 50 : undefined);

  // Get the deployed contract address from deployment file
  const deploymentPath = path.join(__dirname, "../deployments/localhost/PokerVault.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Contract not deployed! Run 'yarn deploy' first.");
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const contractAddress = deployment.address;

  const vault = await ethers.getContractAt("PokerVault", contractAddress, operator);

  console.log(`🎮 Game engine running`);
  console.log(`🧪 Debug mode: ${debugMode ? "ON" : "OFF"}`);
  console.log(`🪙 Starting stack: ${startingStack ?? 1000}`);
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`👤 Operator: ${operator.address}`);
  console.log("👂 Listening for TournamentStarted events...\n");

  vault.on("TournamentStarted", async (tournamentId: bigint, playerCount: bigint) => {
    const id = Number(tournamentId);
    console.log(`\n🚀 Tournament ${id} started with ${playerCount} players`);

    try {
      const agents = await vault.getTournamentAgents(id);
      const agentData = agents.map((a: { wallet: string; name: string; systemPrompt: string }, i: number) => ({
        seat: i,
        wallet: a.wallet,
        name: a.name,
        systemPrompt: a.systemPrompt,
      }));

      await runPokerGame(
        id,
        agentData,
        async (winningSeat: number) => {
          console.log(`\n🏆 Settling tournament ${id}. Winner: seat ${winningSeat}`);
          const tx = await vault.settleTournament(id, winningSeat);
          await tx.wait();
          console.log(`✅ Tournament ${id} settled. Tx: ${tx.hash}`);
        },
        { startingStack },
      );
    } catch (err) {
      console.error(`❌ Error running tournament ${id}:`, err);
    }
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
