import * as dotenv from "dotenv";
dotenv.config();
import { ethers, network } from "hardhat";
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

function parseAgentCount(): number {
  const raw = process.env.POKER_DEFAULT_AGENT_COUNT;
  if (!raw) return 4;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 2 || parsed > 10) {
    throw new Error("POKER_DEFAULT_AGENT_COUNT must be a number between 2 and 10.");
  }
  return Math.floor(parsed);
}

function parseMinPlayersToStart(): number {
  const raw = process.env.POKER_MIN_PLAYERS_TO_START;
  if (!raw) return 4;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 2 || parsed > 10) {
    throw new Error("POKER_MIN_PLAYERS_TO_START must be a number between 2 and 10.");
  }
  return Math.floor(parsed);
}

function parseBuyInWei(): bigint {
  const raw = process.env.POKER_DEFAULT_BUY_IN || "0.1";
  try {
    const parsed = ethers.parseEther(raw);
    if (parsed < 0n) throw new Error("negative buy-in");
    return parsed;
  } catch {
    throw new Error("POKER_DEFAULT_BUY_IN must be a valid MON amount (example: 0.1).");
  }
}

async function main() {
  const [operator] = await ethers.getSigners();
  const debugMode = ["1", "true", "yes", "on"].includes((process.env.POKER_DEBUG_MODE || "").toLowerCase());
  const explicitStartingStack = parseStartingStack();
  const startingStack = explicitStartingStack ?? (debugMode ? 50 : undefined);
  const defaultAgentCount = parseAgentCount();
  const minPlayersToStart = parseMinPlayersToStart();
  const defaultBuyInWei = parseBuyInWei();

  if (minPlayersToStart > defaultAgentCount) {
    throw new Error("POKER_MIN_PLAYERS_TO_START cannot exceed POKER_DEFAULT_AGENT_COUNT.");
  }

  // Resolve deployment artifacts based on the target network.
  const deploymentNetwork = process.env.GAME_ENGINE_DEPLOYMENT_NETWORK || network.name;
  const deploymentsDir = path.join(__dirname, `../deployments/${deploymentNetwork}`);
  const vaultPath = path.join(deploymentsDir, "PokerVault.json");
  const bettingPath = path.join(deploymentsDir, "TournamentBetting.json");
  if (!fs.existsSync(vaultPath)) {
    console.error(
      `❌ Contract not deployed for '${deploymentNetwork}'. Run 'yarn deploy --network ${deploymentNetwork}' first.`,
    );
    process.exit(1);
  }
  const vaultDeployment = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
  const vault = await ethers.getContractAt("PokerVault", vaultDeployment.address, operator);

  let betting: any = null;
  if (fs.existsSync(bettingPath)) {
    const bettingDeployment = JSON.parse(fs.readFileSync(bettingPath, "utf-8"));
    betting = await ethers.getContractAt("TournamentBetting", bettingDeployment.address, operator);
  }

  console.log(`🎮 Game engine running`);
  console.log(`🧪 Debug mode: ${debugMode ? "ON" : "OFF"}`);
  console.log(`🪙 Starting stack: ${startingStack ?? 1000}`);
  console.log(`🪑 Table size: ${defaultAgentCount}`);
  console.log(`🎯 Min players to start: ${minPlayersToStart}`);
  console.log(`💰 Default buy-in: ${ethers.formatEther(defaultBuyInWei)} MON`);
  console.log(`📍 PokerVault: ${vaultDeployment.address}`);
  console.log(`📍 Betting: ${betting ? await betting.getAddress() : "not deployed"}`);
  console.log(`👤 Operator: ${operator.address}`);
  console.log("👂 Listening for tournament events...\n");

  const tournamentQueue: number[] = [];
  const queued = new Set<number>();
  let processingQueue = false;
  let startInFlight = false;

  async function enqueueTournament(id: number): Promise<void> {
    if (queued.has(id)) return;
    queued.add(id);
    tournamentQueue.push(id);
    await processQueue();
  }

  async function processQueue(): Promise<void> {
    if (processingQueue) return;
    processingQueue = true;
    try {
      while (tournamentQueue.length > 0) {
        const id = tournamentQueue.shift()!;
        queued.delete(id);
        await runTournament(id);
      }
    } finally {
      processingQueue = false;
    }
  }

  async function createOpenTournament(): Promise<number> {
    const createTx = await vault.createTournament(defaultBuyInWei, defaultAgentCount);
    const createReceipt = await createTx.wait();
    if (!createReceipt) {
      throw new Error("Tournament creation receipt missing.");
    }
    const createEvent = createReceipt.logs.find((log: any) => log.fragment?.name === "TournamentCreated") as
      | { args?: any[] }
      | undefined;
    const tournamentId = createEvent?.args?.[0]
      ? Number(createEvent.args[0])
      : Number(await vault.nextTournamentId()) - 1;

    console.log(
      `🆕 Created tournament ${tournamentId} (${ethers.formatEther(defaultBuyInWei)} MON, ${defaultAgentCount} agents)`,
    );
    console.log(`⏳ Waiting for at least ${minPlayersToStart} players before starting`);
    return tournamentId;
  }

  const BETTING_COUNTDOWN_SECONDS = 12;

  async function tryStartTournament(tournamentId: number): Promise<void> {
    if (startInFlight) return;
    const tuple = (await vault.tournaments(tournamentId)) as [bigint, bigint, bigint, bigint, string];
    const [, , status] = tuple;
    if (Number(status) !== 0) return;

    const agents = await vault.getTournamentAgents(tournamentId);
    if (agents.length < minPlayersToStart) return;

    startInFlight = true;
    try {
      console.log(`⏳ Betting window: ${BETTING_COUNTDOWN_SECONDS}s before start...`);
      await new Promise(resolve => setTimeout(resolve, BETTING_COUNTDOWN_SECONDS * 1000));
      await (await vault.startTournament(tournamentId)).wait();
      console.log(`🚀 Tournament ${tournamentId} started (${agents.length} players)`);
    } catch {
      // Another caller may have started it first; ignore.
    } finally {
      startInFlight = false;
    }
  }

  async function ensureLiveTournament(): Promise<void> {
    const activeTournamentId = Number(await vault.activeTournamentId());
    if (activeTournamentId === 0) {
      await createOpenTournament();
      return;
    }

    const tuple = (await vault.tournaments(activeTournamentId)) as [bigint, bigint, bigint, bigint, string];
    const status = Number(tuple[2]);

    if (status === 0) {
      console.log(`♻️ Found open active tournament ${activeTournamentId}`);
      await tryStartTournament(activeTournamentId);
      return;
    }

    if (status === 1) {
      console.log(`▶️ Found running tournament ${activeTournamentId}, adding to queue`);
      await enqueueTournament(activeTournamentId);
      return;
    }

    await createOpenTournament();
  }

  async function runTournament(id: number): Promise<void> {
    const tuple = (await vault.tournaments(id)) as [bigint, bigint, bigint, bigint, string];
    const status = Number(tuple[2]);
    if (status !== 1) {
      console.log(`⏭️ Skipping tournament ${id} (status ${status})`);
      return;
    }

    console.log(`\n🎮 Running tournament ${id}`);
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

        if (betting) {
          try {
            const btx = await betting.settleBetting(id, winningSeat);
            await btx.wait();
            console.log(`✅ Betting settled for tournament ${id}. Tx: ${btx.hash}`);
          } catch {
            console.log(`ℹ️  Betting settlement skipped (no bets or already settled)`);
          }
        }

        await createOpenTournament();
      },
      { startingStack },
    );
  }

  (vault as any).on("TournamentStarted", async (tournamentId: bigint, playerCount: bigint) => {
    const id = Number(tournamentId);
    console.log(`\n👂 TournamentStarted detected: #${id} (${playerCount} players)`);
    enqueueTournament(id).catch(err => {
      console.error(`❌ Queue error for tournament ${id}:`, err);
    });
  });

  (vault as any).on("AgentEntered", async (tournamentId: bigint, seatIndex: bigint) => {
    const id = Number(tournamentId);
    console.log(`👤 Agent entered tournament #${id} (seat ${Number(seatIndex)})`);
    tryStartTournament(id).catch(err => {
      console.error(`❌ Start check failed for tournament ${id}:`, err);
    });
  });

  await ensureLiveTournament();

  // Keep alive
  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
