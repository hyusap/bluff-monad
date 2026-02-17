import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("PokerVault", "0x5FbDB2315678afecb367f032d93F642f64180aa3", deployer);

  const tournamentId = process.env.TOURNAMENT_ID ? Number(process.env.TOURNAMENT_ID) : 1;
  console.log(`Starting tournament ${tournamentId} as operator ${deployer.address}`);

  const tx = await vault.startTournament(tournamentId);
  await tx.wait();
  console.log("✅ Tournament started! Tx:", tx.hash);
}

main().catch(err => { console.error(err); process.exit(1); });
