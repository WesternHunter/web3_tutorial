import { task } from "hardhat/config";

const interactFundMeTask = task(
  "interact-fundme",
  "Interact with a deployed FundMe contract",
)
  .addPositionalArgument({
    name: "addr",
    description: "The deployed FundMe contract address",
  })
  .setInlineAction(async ({ addr }, hre) => {
    const { ethers } = await hre.network.create();
    const [firstAccount, secondAccount] = await ethers.getSigners();

    if (secondAccount === undefined) {
      throw new Error(
        "Two accounts are required. Add a second private key to the network accounts configuration.",
      );
    }

    const fundMe = await ethers.getContractAt("FundMe", addr, firstAccount);
    const sendValue = ethers.parseEther("0.01");

    const fundTx = await fundMe.fund({ value: sendValue });
    await fundTx.wait();

    console.log(
      `2 accounts are ${firstAccount.address} and ${secondAccount.address}`,
    );

    const balanceOfContract = await ethers.provider.getBalance(addr);
    console.log(`Balance of the contract is ${balanceOfContract}`);

    const fundTxWithSecondAccount = await fundMe
      .connect(secondAccount)
      .fund({ value: sendValue });
    await fundTxWithSecondAccount.wait();

    const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(
      addr,
    );
    console.log(
      `Balance of the contract is ${balanceOfContractAfterSecondFund}`,
    );

    const firstAccountBalanceInFundMe = await fundMe.fundersToAmount(
      firstAccount.address,
    );
    const secondAccountBalanceInFundMe = await fundMe.fundersToAmount(
      secondAccount.address,
    );

    console.log(
      `Balance of first account ${firstAccount.address} is ${firstAccountBalanceInFundMe}`,
    );
    console.log(
      `Balance of second account ${secondAccount.address} is ${secondAccountBalanceInFundMe}`,
    );
  });

export default interactFundMeTask.build();
