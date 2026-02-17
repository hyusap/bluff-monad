/**
 * Creates a tournament with 4 agents, each with a distinct system prompt.
 * Registers each agent in the ERC-8004 AgentIdentityRegistry so they
 * accumulate reputation and appear on the leaderboard.
 *
 * The game engine (runGame.ts) must already be running to pick up the TournamentStarted event.
 */
import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const AGENTS = [
  {
    name: "The Bluffer",
    systemPrompt: `You are an aggressive, deceptive poker player. Your strategy is to bluff often and apply maximum pressure. You raise frequently to steal pots, even with weak hands. You rarely fold — you believe showing weakness is fatal. When you have a strong hand, disguise it with the same aggression. Your goal: make everyone fear you.`,
  },
  {
    name: "Rock Solid",
    systemPrompt: `You are an extremely tight, conservative poker player. You only play premium hands (AA, KK, QQ, AK, AQ). Fold everything else preflop. When you do play, bet for value — no bluffing. You are patient and disciplined. Waiting for the right moment is your strength. Never call raises without top-tier cards.`,
  },
  {
    name: "The Calculator",
    systemPrompt: `You are a mathematically precise poker player who plays strictly by pot odds and expected value. If the pot odds justify a call, you call. If you have fold equity and a strong hand, you raise. You never let emotions guide decisions — only math. Fold when the numbers say fold, call when they say call. Be methodical and consistent.`,
  },
  {
    name: "Loose Cannon",
    systemPrompt: `You are a wild, unpredictable poker player. Your strategy is pure chaos — call with any two cards, raise randomly to confuse opponents, and occasionally make huge bluffs with nothing. You love gambling and live for big pots. You believe any hand can win. Sometimes fold on strong hands just to mess with people's heads.`,
  },
];

function loadAddress(contractName: string): string {
  const p = path.join(__dirname, `../deployments/localhost/${contractName}.json`);
  if (!fs.existsSync(p)) {
    console.error(`❌ ${contractName} not deployed! Run 'yarn deploy' first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf-8")).address;
}

async function main() {
  const signers = await ethers.getSigners();
  const [operator, s1, s2, s3, s4] = signers;
  const agentSigners = [s1, s2, s3, s4];

  const vault = await ethers.getContractAt("PokerVault", loadAddress("PokerVault"), operator);
  const identity = await ethers.getContractAt("AgentIdentityRegistry", loadAddress("AgentIdentityRegistry"), operator);

  // Register agents in the identity registry (so they appear on the leaderboard)
  const agentIds: bigint[] = [];
  for (let i = 0; i < AGENTS.length; i++) {
    const signer = agentSigners[i];
    const tx = await identity.connect(signer).register(`agent://${AGENTS[i].name.toLowerCase().replace(/\s+/g, "-")}`);
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "Registered");
    const agentId = event.args[0];
    agentIds.push(agentId);
    console.log(`  Registered: ${AGENTS[i].name} → agentId #${agentId}`);
  }

  // Create tournament (free, 4 players)
  const tx = await vault.createTournament(0, 4);
  const receipt = await tx.wait();
  const event = receipt.logs.find((l: any) => l.fragment?.name === "TournamentCreated");
  const tournamentId = Number(event.args[0]);
  console.log(`\n✅ Created tournament #${tournamentId}`);

  // Enter all 4 agents with their registered agentId
  for (let i = 0; i < AGENTS.length; i++) {
    const { name, systemPrompt } = AGENTS[i];
    const signer = agentSigners[i];
    await (await vault.connect(signer).enterTournament(tournamentId, name, systemPrompt, agentIds[i])).wait();
    console.log(`  Agent entered: ${name} (seat ${i}, agentId #${agentIds[i]})`);
  }

  // Start the tournament — engine will pick up the TournamentStarted event
  await (await vault.startTournament(tournamentId)).wait();
  console.log(`\n🚀 Tournament #${tournamentId} started!`);
  console.log(`👉 Watch live at: http://localhost:3000/tournaments/${tournamentId}`);
  console.log(`   (Game feed updates every 3 seconds)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
