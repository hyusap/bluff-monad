import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployReputationRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const { ethers } = hre;

  const identityRegistry = await get("AgentIdentityRegistry");

  await deploy("AgentReputationRegistry", {
    from: deployer,
    args: [identityRegistry.address],
    log: true,
    autoMine: true,
  });

  // Wire the Reputation Registry into PokerVault so it auto-posts feedback on settlement
  const reputationRegistry = await hre.deployments.get("AgentReputationRegistry");
  const pokerVault = await ethers.getContract("PokerVault", deployer);
  const tx = await (pokerVault as any).setReputationRegistry(reputationRegistry.address);
  await tx.wait();
  console.log(`✅ PokerVault.reputationRegistry set to ${reputationRegistry.address}`);
};

export default deployReputationRegistry;

deployReputationRegistry.tags = ["AgentReputationRegistry"];
deployReputationRegistry.dependencies = ["AgentIdentityRegistry", "PokerVault"];
