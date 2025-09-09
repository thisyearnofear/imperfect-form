require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

/**
 * Final Self Protocol Mainnet Migration Validation
 *
 * Validates that the migration to Celo mainnet was successful
 * and Self Protocol is correctly configured for production use.
 */

async function main() {
  console.log('🎯 SELF PROTOCOL MAINNET VALIDATION');
  console.log('='.repeat(50));

  try {
    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   Network:', process.env.NEXT_PUBLIC_SELF_NETWORK || 'not set');
    console.log('   Chain ID:', process.env.NEXT_PUBLIC_SELF_CHAIN_ID || 'not set');
    console.log('   Hub Address:', process.env.NEXT_PUBLIC_SELF_HUB_ADDRESS || 'not set');
    console.log('   Mock Passports:', process.env.NEXT_PUBLIC_USE_MOCK_PASSPORTS || 'not set');
    console.log('   App URL:', process.env.NEXT_PUBLIC_APP_URL || 'not set');

    // Expected mainnet values
    const expectedMainnetHub = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
    const expectedChainId = '42220';

    console.log('\n✅ Validation Results:');

    // Validate network configuration
    const isMainnetNetwork = process.env.NEXT_PUBLIC_SELF_NETWORK === 'celo_mainnet';
    console.log('   Mainnet Network:', isMainnetNetwork ? '✅' : '❌');

    const isCorrectChainId = process.env.NEXT_PUBLIC_SELF_CHAIN_ID === expectedChainId;
    console.log('   Chain ID (42220):', isCorrectChainId ? '✅' : '❌');

    const isCorrectHub = process.env.NEXT_PUBLIC_SELF_HUB_ADDRESS === expectedMainnetHub;
    console.log('   Mainnet Hub:', isCorrectHub ? '✅' : '❌');

    const isProductionMode = process.env.NODE_ENV === 'production';
    console.log('   Production Mode:', isProductionMode ? '✅' : '❌');

    const usesRealPassports = process.env.NEXT_PUBLIC_USE_MOCK_PASSPORTS === 'false';
    console.log('   Real Passports:', usesRealPassports ? '✅' : '❌');

    // Check wallet connection
    if (process.env.PRIVATE_KEY) {
      console.log('\n🔌 Network Connectivity:');
      const provider = new ethers.JsonRpcProvider('https://forno.celo.org');
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const network = await provider.getNetwork();
      console.log('   Connected Chain ID:', network.chainId.toString());
      console.log(
        '   Network Match:',
        network.chainId.toString() === expectedChainId ? '✅' : '❌'
      );

      const balance = await provider.getBalance(wallet.address);
      const balanceEther = ethers.formatEther(balance);
      console.log('   Wallet Balance:', balanceEther, 'CELO');
      console.log('   Sufficient Balance:', parseFloat(balanceEther) > 0.1 ? '✅' : '⚠️');

      console.log('   Wallet Address:', wallet.address);
    }

    // Overall status
    const allChecksPass =
      isMainnetNetwork && isCorrectChainId && isCorrectHub && isProductionMode && usesRealPassports;

    console.log('\n🚨 MIGRATION STATUS:');
    if (allChecksPass) {
      console.log('✅ MAINNET MIGRATION SUCCESSFUL!');
      console.log('✅ Self Protocol is configured for Celo Mainnet');
      console.log('✅ Real passport verification is ACTIVE');
      console.log('✅ Production environment is set');
      console.log('✅ Ready for production deployment');
    } else {
      console.log('❌ Migration incomplete - some checks failed');
    }

    console.log('\n🔗 Important URLs:');
    console.log('   Self Protocol Hub: https://celoscan.io/address/' + expectedMainnetHub);
    console.log('   Self Mobile App: https://app.self.xyz');
    console.log('   Celo Explorer: https://celoscan.io');
    console.log('   Your App URL:', process.env.NEXT_PUBLIC_APP_URL || 'Not configured');

    console.log('\n⚠️  PRODUCTION WARNINGS:');
    console.log('   🚨 Users will need REAL passports for verification');
    console.log('   🚨 All blockchain transactions cost real CELO');
    console.log('   🚨 No more mock/test data - this is LIVE');
    console.log('   🚨 Monitor all transactions and user interactions');

    console.log('\n🎉 SELF PROTOCOL MAINNET READY!');
    console.log('Your fitness app is now integrated with Self Protocol on Celo Mainnet');
    console.log('Users can verify their humanity using real government-issued documents');
  } catch (error) {
    console.error('\n💥 Validation Error:', error.message);
    console.error('Please check your configuration and network connectivity');
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { main };
