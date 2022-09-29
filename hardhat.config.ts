import { HardhatUserConfig } from 'hardhat/config'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@openzeppelin/hardhat-upgrades'

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  mocha: { timeout: 3000000 },
  networks: {
    hardhat: {
      gas: 1600000,
    },
    gethDev: {
      gas: 1600000,
      url: 'http://127.0.0.1:7545',
      accounts: {
        // WARNING: This mnemonic, and its accounts, are publicly known.
        // Any funds sent to them on Mainnet or any other live network WILL BE LOST.
        mnemonic: 'test test test test test test test test test test test junk',
        count: 4,
      },
    },
  },
}

export default config
