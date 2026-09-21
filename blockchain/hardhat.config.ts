import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem"
import { defineConfig } from "hardhat/config"

/* =========================================================
   TRACE-X BLOCKCHAIN CONFIGURATION
========================================================= */

export default defineConfig({
  plugins: [
    hardhatToolboxViemPlugin,
  ],

  solidity: {
    version:
      "0.8.34",

    settings: {
      optimizer: {
        enabled:
          true,

        runs:
          200,
      },
    },
  },

  /*
   * Hardhat's local development blockchain.
   *
   * Chain ID 31337 is development-only.
   */
  networks: {
    node: {
      type:
        "edr-simulated",

      chainId:
        31337,
    },
  },
})