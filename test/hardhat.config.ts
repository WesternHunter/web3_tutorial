import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { configVariable, defineConfig } from "hardhat/config";

import deployFundMeTask from "./tasks/deploy-fundme.js";
import interactFundMeTask from "./tasks/interact-fundme.js";


export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatEthers, hardhatVerify],
  tasks: [deployFundMeTask, interactFundMeTask],
  verify: {
    etherscan: {
      // 验证的api_key
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      // 就像一条“通往 Sepolia 测试网的网线”，相当于网络的接入口
      url: configVariable("SEPOLIA_RPC_URL"),
      // 账户的私钥（metamask里面账号的私钥）
      accounts: [
        configVariable("SEPOLIA_PRIVATE_KEY"),
        configVariable("SEPOLIA_PRIVATE_KEY_2")
      ],
    },
  },
});
