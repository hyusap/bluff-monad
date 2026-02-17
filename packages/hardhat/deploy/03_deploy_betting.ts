import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployBetting: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const pokerVault = await get("PokerVault");

  // deployer acts as the initial operator for local dev
  await deploy("TournamentBetting", {
    from: deployer,
    args: [pokerVault.address, deployer],
    log: true,
    autoMine: true,
  });
};

export default deployBetting;

deployBetting.tags = ["TournamentBetting"];
deployBetting.dependencies = ["PokerVault"];
