/**
 * Creates a tournament with 4 agents, each with a distinct system prompt.
 * The game engine (runGame.ts) must already be running to pick up the TournamentStarted event.
 */
import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

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

async function main() {
  const signers = await ethers.getSigners();
  const [operator, s1, s2, s3, s4] = signers;
  const agentSigners = [s1, s2, s3, s4];

  const vault = await ethers.getContractAt("PokerVault", CONTRACT_ADDRESS, operator);

  // Create tournament (free, 4 players)
  const tx = await vault.createTournament(0, 4);
  const receipt = await tx.wait();
  const event = receipt.logs.find((l: any) => l.fragment?.name === "TournamentCreated");
  const tournamentId = Number(event.args[0]);
  console.log(`✅ Created tournament #${tournamentId}`);

  // Enter all 4 agents
  for (let i = 0; i < AGENTS.length; i++) {
    const { name, systemPrompt } = AGENTS[i];
    const signer = agentSigners[i];
    await (await vault.connect(signer).enterTournament(tournamentId, name, systemPrompt)).wait();
    console.log(`  Agent entered: ${name} (seat ${i})`);
  }

  // Start the tournament — engine will pick up the TournamentStarted event
  await (await vault.startTournament(tournamentId)).wait();
  console.log(`\n🚀 Tournament #${tournamentId} started!`);
  console.log(`👉 Watch live at: http://localhost:3000/tournaments/${tournamentId}`);
  console.log(`   (Game feed updates every 3 seconds)`);
}

main().catch(err => { console.error(err); process.exit(1); });
