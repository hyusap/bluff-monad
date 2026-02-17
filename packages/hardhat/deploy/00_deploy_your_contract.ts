import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployPokerVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("PokerVault", {
    from: deployer,
    // deployer is both owner and operator for local dev
    args: [deployer],
    log: true,
    autoMine: true,
  });
};

export default deployPokerVault;

deployPokerVault.tags = ["PokerVault"];
