import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const LOCK_TIME = 30;
const WAIT_AFTER_LOCK_TIME_MS = (LOCK_TIME + 10) * 1000;
const TARGET_REACHED_USD = 120n * 10n ** 18n;
const TARGET_NOT_REACHED_USD = 20n * 10n ** 18n;
const PRICE_FEED_DECIMALS = 10n ** 8n;

const connection = await network.create();
const { ethers } = connection;
const shouldRunStagingTests = connection.networkName === "sepolia";

let fundMe;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usdToEthWei(usdAmount, ethPrice) {
  return (usdAmount * PRICE_FEED_DECIMALS + ethPrice - 1n) / ethPrice;
}

async function getEthAmountForUsd(usdAmount) {
  const ethPrice = await fundMe.getChainlinkDataFeedLatestAnswer();
  return usdToEthWei(usdAmount, ethPrice);
}

describe(
  "test fundme contract on staging network",
  { skip: !shouldRunStagingTests },
  async function () {
    beforeEach(async function () {
      fundMe = await ethers.deployContract("FundMe", [LOCK_TIME]);
      await fundMe.waitForDeployment();
    });

    it("fund and getFund successfully", { timeout: 120000 }, async function () {
      const fundValue = await getEthAmountForUsd(TARGET_REACHED_USD);

      const fundTx = await fundMe.fund({ value: fundValue });
      await fundTx.wait();

      await sleep(WAIT_AFTER_LOCK_TIME_MS);

      const getFundTx = await fundMe.getFund();
      await getFundTx.wait();

      assert.equal(await ethers.provider.getBalance(fundMe.target), 0n);
      assert.equal(await fundMe.getFundSuccess(), true);
    });

    it("fund and refund successfully", { timeout: 120000 }, async function () {
      const fundValue = await getEthAmountForUsd(TARGET_NOT_REACHED_USD);
      const [firstAccount] = await ethers.getSigners();

      const fundTx = await fundMe.fund({ value: fundValue });
      await fundTx.wait();

      await sleep(WAIT_AFTER_LOCK_TIME_MS);

      const refundTx = await fundMe.refund();
      await refundTx.wait();

      assert.equal(await ethers.provider.getBalance(fundMe.target), 0n);
      assert.equal(await fundMe.fundersToAmount(firstAccount.address), 0n);
    });
  },
);
