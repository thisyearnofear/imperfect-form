require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

/**
 * Self Protocol Mainnet Switch
 *
 * Simple script to switch from testnet to mainnet configuration
 * Since Self Protocol is a verification service, we don't need to deploy
 * new contracts - just switch to the mainnet hub and update config.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAINNET_CONFIG = {
  // Celo Mainnet Self Protocol Hub
  hubAddress: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
  chainId: 42220,
  networkName: 'celo_mainnet',
  rpcUrl: 'https://forno.celo.org',
  blockExplorer: 'https://celoscan.io',
  useMockPassports: false, // Real passports on mainnet
};

const TESTNET_CONFIG = {
  // Celo Testnet Self Protocol Hub
  hubAddress: '0x68c931C9a534D37aa78094877F46fE46a49F1A51',
  chainId: 44787,
  networkName: 'celo_testnet',
  rpcUrl: 'https://alfajores-forno.celo-testnet.org',
  blockExplorer: 'https://alfajores.celoscan.io',
  useMockPassports: true, // Mock passports on testnet
};

// Self Protocol configuration (same for both networks)
const SELF_CONFIG = {
  scope: 'imperfect-form-fitness',
  configId: '0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61',
  minimumAge: 13,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check wallet balance on target network
 */
async function checkWalletBalance(config) {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env.local');
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const balance = await provider.getBalance(wallet.address);
    const balanceEther = ethers.formatEther(balance);

    console.log(`💰 ${config.networkName} balance: ${balanceEther} CELO`);

    return {
      address: wallet.address,
      balance: balanceEther,
      sufficient: parseFloat(balanceEther) > 0.1,
    };
  } catch (error) {
    console.error(`❌ Failed to check balance on ${config.networkName}:`, error.message);
    return null;
  }
}

/**
 * Generate environment file for target network
 */
function generateEnvironmentFile(config, isMainnet = false) {
  const timestamp = new Date().toISOString();
  const environment = isMainnet ? 'production' : 'development';

  const envContent = `# SELF PROTOCOL ${config.networkName.toUpperCase()} CONFIG
# Generated: ${timestamp}
# Environment: ${environment}

NODE_ENV=${environment}

# Application Configuration
NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || 'https://imperfectform.fun'}

# Self Protocol Configuration
NEXT_PUBLIC_SELF_NETWORK=${config.networkName}
NEXT_PUBLIC_SELF_CHAIN_ID=${config.chainId}
NEXT_PUBLIC_SELF_HUB_ADDRESS=${config.hubAddress}
NEXT_PUBLIC_SELF_SCOPE_NAME=${SELF_CONFIG.scope}
NEXT_PUBLIC_SELF_CONFIG_ID=${SELF_CONFIG.configId}

# Network Configuration
NEXT_PUBLIC_USE_MOCK_PASSPORTS=${config.useMockPassports}
NEXT_PUBLIC_NETWORK_RPC_URL=${config.rpcUrl}
NEXT_PUBLIC_BLOCK_EXPLORER=${config.blockExplorer}

# Deployment Configuration
PRIVATE_KEY=${process.env.PRIVATE_KEY || ''}

# External Services
NEYNAR_API_KEY=${process.env.NEYNAR_API_KEY || ''}
NEXT_PUBLIC_NEYNAR_CLIENT_ID=${process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || ''}

# Self Protocol Verification Endpoint
NEXT_PUBLIC_SELF_ENDPOINT=\${NEXT_PUBLIC_APP_URL}/api/self/verify

# Security Notes
# - ${isMainnet ? 'MAINNET USES REAL PASSPORTS' : 'TESTNET USES MOCK PASSPORTS'}
# - ${isMainnet ? 'Double-check all transactions' : 'Safe for testing and development'}
# - Keep private keys secure and never commit them
`;

  const filename = isMainnet ? '.env.production' : '.env.development';
  const filepath = path.join(__dirname, '..', filename);

  fs.writeFileSync(filepath, envContent);
  console.log(`📄 Generated ${filename}`);

  return filepath;
}

/**
 * Save network switch information
 */
function saveNetworkSwitch(fromNetwork, toNetwork, walletInfo) {
  const switchInfo = {
    timestamp: new Date().toISOString(),
    fromNetwork: fromNetwork.networkName,
    toNetwork: toNetwork.networkName,
    fromChainId: fromNetwork.chainId,
    toChainId: toNetwork.chainId,
    fromHub: fromNetwork.hubAddress,
    toHub: toNetwork.hubAddress,
    walletAddress: walletInfo?.address || 'unknown',
    walletBalance: walletInfo?.balance || '0',
    selfProtocol: {
      scope: SELF_CONFIG.scope,
      configId: SELF_CONFIG.configId,
      minimumAge: SELF_CONFIG.minimumAge,
    },
    useMockPassports: toNetwork.useMockPassports,
    environment: toNetwork.networkName.includes('mainnet') ? 'production' : 'development',
  };

  const switchPath = path.join(__dirname, '../deployments');
  if (!fs.existsSync(switchPath)) {
    fs.mkdirSync(switchPath, { recursive: true });
  }

  const filename = `network-switch-${Date.now()}.json`;
  const filepath = path.join(switchPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(switchInfo, null, 2));
  console.log(`💾 Network switch logged: ${filename}`);

  return switchInfo;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.log('🔄 SELF PROTOCOL NETWORK SWITCH');
  console.log('='.repeat(50));

  try {
    // Determine current and target networks
    const currentEnv = process.env.NODE_ENV || 'development';
    const isCurrentlyMainnet = currentEnv === 'production';
    const targetMainnet = !isCurrentlyMainnet; // Switch to opposite

    const currentNetwork = isCurrentlyMainnet ? MAINNET_CONFIG : TESTNET_CONFIG;
    const targetNetwork = targetMainnet ? MAINNET_CONFIG : TESTNET_CONFIG;

    console.log(`📡 Current: ${currentNetwork.networkName} (${currentNetwork.chainId})`);
    console.log(`🎯 Target: ${targetNetwork.networkName} (${targetNetwork.chainId})`);

    if (targetMainnet) {
      console.log('🚨 SWITCHING TO MAINNET - REAL PASSPORTS WILL BE USED!');
    } else {
      console.log('🧪 Switching to testnet - mock passports will be used');
    }

    // Check wallet balance on target network
    console.log('\n🔍 Checking wallet configuration...');
    const walletInfo = await checkWalletBalance(targetNetwork);

    if (!walletInfo) {
      throw new Error('Failed to verify wallet on target network');
    }

    if (!walletInfo.sufficient && targetMainnet) {
      console.warn('⚠️  Low CELO balance for mainnet operations');
    }

    // Generate environment file for target network
    console.log('\n⚙️  Generating configuration...');
    const envFile = generateEnvironmentFile(targetNetwork, targetMainnet);

    // Save switch information
    const switchInfo = saveNetworkSwitch(currentNetwork, targetNetwork, walletInfo);

    // Display success information
    console.log('\n🎉 NETWORK SWITCH SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log(`📍 Network: ${targetNetwork.networkName}`);
    console.log(`🔗 Hub: ${targetNetwork.hubAddress}`);
    console.log(`👤 Wallet: ${walletInfo.address}`);
    console.log(`💰 Balance: ${walletInfo.balance} CELO`);
    console.log(`📄 Config: ${path.basename(envFile)}`);

    console.log('\n🚨 IMPORTANT CHANGES:');
    if (targetMainnet) {
      console.log('✅ Switched to MAINNET');
      console.log('✅ Using REAL passport verification');
      console.log('✅ Production-ready configuration');
      console.log('⚠️  All transactions will cost real CELO');
      console.log('⚠️  Users will need real passports for verification');
    } else {
      console.log('✅ Switched to TESTNET');
      console.log('✅ Using MOCK passport verification');
      console.log('✅ Development-safe configuration');
      console.log('💡 Perfect for testing and development');
    }

    console.log('\n⚡ NEXT STEPS:');
    console.log('1. Copy the generated environment file to .env.local:');
    console.log(`   cp ${path.basename(envFile)} .env.local`);
    console.log('2. Restart your development server');
    console.log('3. Test Self Protocol integration:');
    console.log('   npm run self:health');
    if (targetMainnet) {
      console.log('4. Deploy to production with new config');
      console.log('5. Test with a real passport!');
    } else {
      console.log('4. Test with mock passports');
    }

    console.log('\n🔗 Resources:');
    console.log(`• Block Explorer: ${targetNetwork.blockExplorer}`);
    console.log('• Self Protocol App: https://app.self.xyz');
    console.log(`• Network RPC: ${targetNetwork.rpcUrl}`);

    return switchInfo;
  } catch (error) {
    console.error('\n💥 NETWORK SWITCH FAILED');
    console.error('Error:', error.message);

    if (error.message.includes('PRIVATE_KEY')) {
      console.error('💡 Add your private key to .env.local');
    } else if (error.message.includes('balance')) {
      console.error('💡 Add CELO to your wallet for mainnet operations');
    }

    throw error;
  }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Self Protocol network switch completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Network switch failed');
      process.exit(1);
    });
}

module.exports = { main, MAINNET_CONFIG, TESTNET_CONFIG, SELF_CONFIG };
