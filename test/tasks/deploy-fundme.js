import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { task } from "hardhat/config";

const deployFundMeTask = task(
  "deploy-fundme",
  "Deploy and verify the FundMe contract",
).setInlineAction(async (_taskArgs, hre) => {
    const { ethers } = await hre.network.create();
    const fundMeFactory = await ethers.getContractFactory("FundMe");

    console.log("contract deploying");

    const fundMe = await fundMeFactory.deploy(300);
    await fundMe.waitForDeployment();

    console.log(
      `contract has been deployed successfully, contract address is ${fundMe.target}`,
    );

    const currentNetwork = await ethers.provider.getNetwork();

    if (currentNetwork.chainId === 11155111n) {
      console.log("Waiting for 5 confirmations");
      await fundMe.deploymentTransaction().wait(5);

      await verifyContract(
        {
          address: fundMe.target,
          constructorArgs: [300],
          provider: "etherscan",
        },
        hre,
      );
    } else {
      console.log("verification skipped..");
    }

    return fundMe.target;
});

export default deployFundMeTask.build();
