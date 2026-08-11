// import ethers.js
// create main function
// execute main function

import hre from "hardhat";
const { ethers } = await hre.network.create();
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

// 引入ethers包
// const { ethers } = require("hardhat") 

async function main() {
    // 1.create factory 
    // await 同步等待
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    console.log("contract deploying")
    
    // 2.部署合约deploy contract from factory
    const fundMe = await fundMeFactory.deploy(300)
    await fundMe.waitForDeployment()
    console.log(`contract has been deployed successfully, contract address is ${fundMe.target}`);

    // 3.验证fundme合约,本地测试网不需要验证
    const currentNetwork = await ethers.provider.getNetwork()
    // 每个网络都有自己的chainID   sepolia的chainid是11155111
    // 
    if(currentNetwork.chainId === 11155111n) {
        console.log("Waiting for 5 confirmations")
        // 等待五个区块
        await fundMe.deploymentTransaction().wait(5) 
        await verifyFundMe(fundMe.target, [300])
    } else {
        console.log("verification skipped..")
    }

    // 4.init 2 accounts
    const [firstAccount, secondAccount] = await ethers.getSigners()
    
    // 5.fund contract with first account
    const fundTx = await fundMe.fund({value: ethers.parseEther("0.01")})
    await fundTx.wait()

    console.log(`2 accounts are ${firstAccount.address} and ${secondAccount.address}`)
    
    // 6.check balance of contract
    const balanceOfContract = await ethers.provider.getBalance(fundMe.target)
    console.log(`Balance of the contract is ${balanceOfContract}`)

    //7.fund contract with second account
    const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fund({value: ethers.parseEther("0.01")})
    await fundTxWithSecondAccount.wait()

    // 8.check balance of contract
    const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(fundMe.target)
    console.log(`Balance of the contract is ${balanceOfContractAfterSecondFund}`)

    // 9.check mapping 
    const firstAccountbalanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
    const secondAccountbalanceInFundMe = await fundMe.fundersToAmount(secondAccount.address)
    console.log(`Balance of first account ${firstAccount.address} is ${firstAccountbalanceInFundMe}`)
    console.log(`Balance of second account ${secondAccount.address} is ${secondAccountbalanceInFundMe}`)
    
}

// 验证合约
async function verifyFundMe(fundMeAddr, args) {
    await verifyContract({
        address: fundMeAddr,
        constructorArgs: args,
        provider: "etherscan",
    }, hre);
}


main().then().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
