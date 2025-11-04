import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHESoulSign = await deploy("FHESoulSign", {
    from: deployer,
    log: true,
  });

  console.log(`FHESoulSign contract: `, deployedFHESoulSign.address);
};
export default func;
func.id = "deploy_FHESoulSign"; // id required to prevent reexecution
func.tags = ["FHESoulSign"];
