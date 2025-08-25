require('@nomicfoundation/hardhat-ethers');
require('dotenv').config({ path: '.env.local' });

module.exports = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Mainnet configuration
    celoMainnet: {
      url: 'https://forno.celo.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42220,
      gas: 8000000,
      timeout: 60000,
      // Dynamic gas pricing for mainnet
    },

    // Local development
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      gasPrice: 20000000000,
    },
  },
};
