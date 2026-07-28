import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const SEPOLIA_ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const MOCK_ETH_USD_PRICE = 2000n * 10n ** 8n;
const LOCK_TIME = 100;

let ethers;
let networkHelpers;
let fundMe;
let fundMeSecondAccount;
let firstAccount;
let secondAccount;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectRevert(promise, reason) {
  await assert.rejects(promise, (error) => {
    const message = [
      error?.message,
      error?.shortMessage,
      error?.reason,
      JSON.stringify(error?.info ?? {}),
    ].join(" ");

    assert.match(message, new RegExp(escapeRegex(reason)));
    return true;
  });
}

async function installMockPriceFeed() {
  const mockV3Aggregator = await ethers.deployContract("MockV3Aggregator");
  await mockV3Aggregator.waitForDeployment();

  const mockCode = await ethers.provider.getCode(mockV3Aggregator.target);
  await networkHelpers.setCode(SEPOLIA_ETH_USD_FEED, mockCode);
}

describe("test fundme contract", async function () {
  beforeEach(async function () {
    const connection = await network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;

    [firstAccount, secondAccount] = await ethers.getSigners();

    await installMockPriceFeed();

    fundMe = await ethers.deployContract("FundMe", [LOCK_TIME], firstAccount);
    await fundMe.waitForDeployment();
    fundMeSecondAccount = fundMe.connect(secondAccount);
  });

  it("test if the owner is msg.sender", async function () {
    assert.equal(await fundMe.owner(), firstAccount.address);
  });

  it("test if the datafeed is assigned correctly", async function () {
    assert.equal(
      await fundMe.getChainlinkDataFeedLatestAnswer(),
      MOCK_ETH_USD_PRICE,
    );
  });

  it("window closed, value grater than minimum, fund failed", async function () {
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await expectRevert(
      fundMe.fund({ value: ethers.parseEther("0.1") }),
      "window is closed",
    );
  });

  it("window open, value is less than minimum, fund failed", async function () {
    await expectRevert(
      fundMe.fund({ value: ethers.parseEther("0.001") }),
      "Send more ETH",
    );
  });

  it("Window open, value is greater minimum, fund success", async function () {
    const sendValue = ethers.parseEther("0.1");

    await fundMe.fund({ value: sendValue });

    assert.equal(await fundMe.fundersToAmount(firstAccount.address), sendValue);
  });

  it("not onwer, window closed, target reached, getFund failed", async function () {
    await fundMe.fund({ value: ethers.parseEther("1") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await expectRevert(
      fundMeSecondAccount.getFund(),
      "this function can only be called by owner",
    );
  });

  it("window open, target reached, getFund failed", async function () {
    await fundMe.fund({ value: ethers.parseEther("1") });

    await expectRevert(fundMe.getFund(), "window is not closed");
  });

  it("window closed, target not reached, getFund failed", async function () {
    await fundMe.fund({ value: ethers.parseEther("0.01") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await expectRevert(fundMe.getFund(), "Target is not reached");
  });

  it("window closed, target reached, getFund success", async function () {
    await fundMe.fund({ value: ethers.parseEther("1") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await fundMe.getFund();

    assert.equal(await ethers.provider.getBalance(fundMe.target), 0n);
    assert.equal(await fundMe.getFundSuccess(), true);
  });

  it("window open, target not reached, funder has balance", async function () {
    await fundMe.fund({ value: ethers.parseEther("0.01") });

    await expectRevert(fundMe.refund(), "window is not closed");
  });

  it("window closed, target reach, funder has balance", async function () {
    await fundMe.fund({ value: ethers.parseEther("1") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await expectRevert(fundMe.refund(), "Target is reached");
  });

  it("window closed, target not reach, funder does not has balance", async function () {
    await fundMe.fund({ value: ethers.parseEther("0.01") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await expectRevert(
      fundMeSecondAccount.refund(),
      "there is no fund for you",
    );
  });

  it("window closed, target not reached, funder has balance", async function () {
    await fundMe.fund({ value: ethers.parseEther("0.01") });
    await networkHelpers.time.increase(200);
    await networkHelpers.mine();

    await fundMe.refund();

    assert.equal(await ethers.provider.getBalance(fundMe.target), 0n);
    assert.equal(await fundMe.fundersToAmount(firstAccount.address), 0n);
  });
});
