import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { runPokerGame } from "../engine/pokerGame";

const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

async function main() {
  const [operator] = await ethers.getSigners();
  const vault = await ethers.getContractAt("PokerVault", CONTRACT_ADDRESS, operator);

  console.log(`🎮 Game engine running. Operator: ${operator.address}`);
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
