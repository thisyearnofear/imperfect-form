/**
 * Deployment script for StandardFitnessLeaderboard contract
 * For use on Monad, Polygon, and Base networks (non-verification chains)
 */

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Deploying StandardFitnessLeaderboard contract...');

  // Get the contract factory
  const StandardFitnessLeaderboard = await ethers.getContractFactory('StandardFitnessLeaderboard');

  // Deploy the contract
  console.log('📦 Deploying contract...');
  const contract = await StandardFitnessLeaderboard.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('✅ StandardFitnessLeaderboard deployed to:', contractAddress);

  // Get network information
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  console.log('🌐 Network:', network.name);
  console.log('🔗 Chain ID:', chainId.toString());

  // Verify deployment by calling a view function
  try {
    const maxScore = await contract.MAX_SCORE_PER_SUBMISSION();
    const cooldown = await contract.SUBMISSION_COOLDOWN();
    const owner = await contract.owner();

    console.log('📊 Contract verification:');
    console.log('  - Max score per submission:', maxScore.toString());
    console.log('  - Submission cooldown:', cooldown.toString(), 'seconds');
    console.log('  - Owner:', owner);

    // Test basic functionality
    const leaderboardLength = await contract.getLeaderboardLength();
    console.log('  - Initial leaderboard length:', leaderboardLength.toString());
  } catch (error) {
    console.error('❌ Contract verification failed:', error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    chainId: chainId.toString(),
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address,
    contractName: 'StandardFitnessLeaderboard',
    features: [
      'Standard fitness scoring',
      'No verification required',
      'Cooldown protection',
      'Leaderboard tracking',
      'Admin controls',
    ],
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `standard-fitness-${chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('💾 Deployment info saved to:', deploymentFile);

  // Network-specific instructions
  const networkInstructions = {
    137: {
      // Polygon
      name: 'Polygon Mainnet',
      explorer: 'https://polygonscan.com',
      rpc: 'https://polygon-rpc.com',
    },
    8453: {
      // Base
      name: 'Base Mainnet',
      explorer: 'https://basescan.org',
      rpc: 'https://mainnet.base.org',
    },
    10143: {
      // Monad Testnet
      name: 'Monad Testnet',
      explorer: 'https://testnet-explorer.monad.xyz',
      rpc: 'https://testnet-rpc.monad.xyz',
    },
  };

  const networkInfo = networkInstructions[chainId.toString()];
  if (networkInfo) {
    console.log('\n📋 Next steps for', networkInfo.name + ':');
    console.log(
      '1. Verify contract on explorer:',
      `${networkInfo.explorer}/address/${contractAddress}`
    );
    console.log('2. Update network configuration in src/config/networks.ts');
    console.log('3. Test contract interaction with the frontend');
    console.log('4. Update environment variables if needed');
  }

  console.log('\n🎉 Deployment completed successfully!');
  console.log('Contract address:', contractAddress);
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
