const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying VerifiedFitnessLeaderboardStandardized with Self Protocol integration...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId.toString());

  // Self Protocol verification contract addresses by network
  const VERIFICATION_CONTRACTS = {
    // Add your Self Protocol contract addresses here
    // These should be deployed first using deploy-self-protocol.js
    1: "0x...", // Ethereum Mainnet
    8453: "0x...", // Base Mainnet  
    137: "0x...", // Polygon Mainnet
    42220: "0x...", // Celo Mainnet
    // Add testnet addresses as needed
  };

  const chainId = Number(network.chainId);
  const verificationContractAddress = VERIFICATION_CONTRACTS[chainId];

  if (!verificationContractAddress || verificationContractAddress === "0x...") {
    console.error("❌ No Self Protocol verification contract address configured for chain ID:", chainId);
    console.log("📋 Please deploy the Self Protocol contract first using:");
    console.log("   npx hardhat run scripts/deploy-self-protocol.js --network <network>");
    console.log("📋 Then update the VERIFICATION_CONTRACTS mapping in this script");
    process.exit(1);
  }

  console.log("🔗 Using Self Protocol verification contract:", verificationContractAddress);

  try {
    // Get the contract factory
    const VerifiedFitnessLeaderboardStandardized = await ethers.getContractFactory("VerifiedFitnessLeaderboardStandardized");

    // Deploy the contract
    console.log("⏳ Deploying contract...");
    const contract = await VerifiedFitnessLeaderboardStandardized.deploy(verificationContractAddress);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("✅ VerifiedFitnessLeaderboardStandardized deployed successfully!");
    console.log("📍 Contract address:", contractAddress);
    console.log("🔗 Verification contract:", verificationContractAddress);

    // Wait for a few block confirmations before verification
    console.log("⏳ Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify contract on block explorer (if not local network)
    if (network.chainId !== 31337n && network.chainId !== 1337n) {
      try {
        console.log("🔍 Verifying contract on block explorer...");
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [verificationContractAddress],
        });
        console.log("✅ Contract verified on block explorer");
      } catch (error) {
        console.log("⚠️  Contract verification failed:", error.message);
        console.log("📝 You can verify manually later with:");
        console.log(`   npx hardhat verify --network ${network.name} ${contractAddress} ${verificationContractAddress}`);
      }
    }

    // Test basic functionality
    console.log("\n🧪 Testing basic contract functionality...");
    
    try {
      // Test view functions
      const totalUsers = await contract.getTotalUsers();
      console.log("👥 Total users on leaderboard:", totalUsers.toString());
      
      const verificationStats = await contract.getVerificationStats();
      console.log("📊 Verification stats:", {
        totalVerifiedUsers: verificationStats[0].toString(),
        lastVerifiedUser: verificationStats[1],
        lastVerificationTimestamp: verificationStats[2].toString()
      });

      // Test leaderboard function
      const leaderboard = await contract.getLeaderboard();
      console.log("🏆 Current leaderboard entries:", leaderboard.length);

      console.log("✅ All basic functions working correctly!");

    } catch (error) {
      console.error("❌ Error testing contract functionality:", error.message);
    }

    // Display deployment summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("🌐 Network:", network.name, `(Chain ID: ${chainId})`);
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔗 Verification Contract:", verificationContractAddress);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Gas Used: Check transaction receipt");
    console.log("=".repeat(60));

    // Instructions for next steps
    console.log("\n📋 NEXT STEPS:");
    console.log("1. Update your frontend constants with the new contract address");
    console.log("2. Update your contract ABI if needed");
    console.log("3. Test the Self Protocol verification flow");
    console.log("4. Consider migrating data from old contract if needed");
    
    console.log("\n🔧 Frontend Integration:");
    console.log(`   Add to constants/contracts.ts:`);
    console.log(`   export const VERIFIED_FITNESS_CONTRACT_ADDRESS = "${contractAddress}";`);

    return {
      contractAddress,
      verificationContractAddress,
      network: network.name,
      chainId
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = main;