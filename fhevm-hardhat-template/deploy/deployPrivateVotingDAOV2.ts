import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("PrivateVotingDAOV2", {
    from: deployer,
    log: true,
  });

  console.log(`PrivateVotingDAOV2 contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_private_voting_dao_v2";
func.tags = ["PrivateVotingDAOV2"];

