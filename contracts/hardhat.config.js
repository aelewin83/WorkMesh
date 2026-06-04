require("@nomicfoundation/hardhat-toolbox");

const privateKey = process.env.PRIVATE_KEY;
const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.RELAI_RPC_URL;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    baseSepolia: {
      url: baseSepoliaRpcUrl || "https://sepolia.base.org",
      chainId: 84532,
      accounts: privateKey ? [privateKey] : []
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD"
  }
};
