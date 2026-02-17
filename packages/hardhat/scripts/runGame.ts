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

async function main() {
  const [operator] = await ethers.getSigners();

  // Get the deployed contract addresses from deployment files
  const vaultPath = path.join(__dirname, "../deployments/localhost/PokerVault.json");
  const bettingPath = path.join(__dirname, "../deployments/localhost/TournamentBetting.json");
  if (!fs.existsSync(vaultPath)) {
    console.error("❌ Contract not deployed! Run 'yarn deploy' first.");
    process.exit(1);
  }
  const vaultDeployment = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
  const vault = await ethers.getContractAt("PokerVault", vaultDeployment.address, operator);

  let betting: Awaited<ReturnType<typeof ethers.getContractAt>> | null = null;
  if (fs.existsSync(bettingPath)) {
    const bettingDeployment = JSON.parse(fs.readFileSync(bettingPath, "utf-8"));
    betting = await ethers.getContractAt("TournamentBetting", bettingDeployment.address, operator);
  }

  console.log(`🎮 Game engine running`);
  console.log(`📍 PokerVault: ${vaultDeployment.address}`);
  console.log(`📍 Betting: ${betting ? await betting.getAddress() : "not deployed"}`);
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

      await runPokerGame(id, agentData, async (winningSeat: number) => {
        console.log(`\n🏆 Settling tournament ${id}. Winner: seat ${winningSeat}`);
        const tx = await vault.settleTournament(id, winningSeat);
        await tx.wait();
        console.log(`✅ Tournament ${id} settled. Tx: ${tx.hash}`);

        // Auto-settle spectator betting
        if (betting) {
          try {
            const btx = await betting.settleBetting(id, winningSeat);
            await btx.wait();
            console.log(`✅ Betting settled for tournament ${id}. Tx: ${btx.hash}`);
          } catch {
            console.log(`ℹ️  Betting settlement skipped (no bets or already settled)`);
          }
        }
      });
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
