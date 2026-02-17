import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployIdentityRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("AgentIdentityRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployIdentityRegistry;

deployIdentityRegistry.tags = ["AgentIdentityRegistry"];
