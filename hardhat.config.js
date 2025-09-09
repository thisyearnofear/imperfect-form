import '@nomicfoundation/hardhat-ethers';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  solidity: '0.8.28',
  networks: {
    celoMainnet: {
      type: 'http',
      url: 'https://forno.celo.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      type: 'edr-simulated',
    },
  },
};
