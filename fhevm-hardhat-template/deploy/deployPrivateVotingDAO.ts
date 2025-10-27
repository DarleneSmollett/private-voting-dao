import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("PrivateVotingDAO", {
    from: deployer,
    log: true,
  });

  console.log(`PrivateVotingDAO contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_private_voting_dao";
func.tags = ["PrivateVotingDAO"];

