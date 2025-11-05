import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECaro = await deploy("FHECaro", {
    from: deployer,
    log: true,
  });

  console.log(`FHECaro contract: `, deployedFHECaro.address);
};
export default func;
func.id = "deploy_FHECaro"; // id required to prevent reexecution
func.tags = ["FHECaro"];
