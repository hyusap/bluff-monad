import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { runPokerGame } from "../engine/pokerGame";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [operator] = await ethers.getSigners();

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
