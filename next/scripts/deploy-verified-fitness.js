const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying VerifiedFitnessLeaderboard to Celo Alfajores...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "CELO");

  if (balance < ethers.parseEther("0.1")) {
    console.warn(
      "⚠️  Low balance! Make sure you have enough CELO for deployment"
    );
  }

  try {
    // Get Self Protocol verification contract address
    const verificationContractAddress =
      process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT;
    if (!verificationContractAddress) {
      console.warn(
        "⚠️  NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT not set. Deploy Self Protocol contract first."
      );
      console.log(
        "💡 Run: npx hardhat run scripts/deploy-self-protocol.js --network celoAlfajores"
      );
      process.exit(1);
    }

    console.log(
      `🔗 Using Self Protocol contract: ${verificationContractAddress}`
    );

    // Deploy the contract
    console.log("\n📦 Deploying VerifiedFitnessLeaderboard...");
    const VerifiedFitnessLeaderboard = await ethers.getContractFactory(
      "VerifiedFitnessLeaderboard"
    );

    const contract = await VerifiedFitnessLeaderboard.deploy(
      verificationContractAddress
    );

    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed to:", contractAddress);

    // Wait a bit for the contract to be available
    console.log("⏳ Waiting for contract to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    try {
      const minimumAge = await contract.MINIMUM_AGE();
      const scopeName = await contract.SCOPE_NAME();
      const owner = await contract.owner();
      const totalUsers = await contract.getTotalUsers();
      const verificationBonus = await contract.verificationBonusPercentage();
      const cooldown = await contract.SUBMISSION_COOLDOWN();
      const maxScore = await contract.MAX_SCORE_PER_SUBMISSION();

      console.log("   Minimum age:", minimumAge.toString());
      console.log("   Scope name:", scopeName);
      console.log("   Owner:", owner);
      console.log("   Total users:", totalUsers.toString());
      console.log("   Verification bonus:", verificationBonus.toString() + "%");
      console.log("   Submission cooldown:", cooldown.toString(), "seconds");
      console.log("   Max score per submission:", maxScore.toString());
    } catch (verifyError) {
      console.log(
        "   Contract deployed but verification calls failed (this is normal immediately after deployment)"
      );
    }

    // Save deployment info
    const deploymentInfo = {
      network: "celoAlfajores",
      contractAddress: contractAddress,
      deployer: deployer.address,
      minimumAge: 16,
      scopeName: "imperfect-form-fitness",
      deploymentTime: new Date().toISOString(),
      blockExplorer: `https://alfajores.celoscan.io/address/${contractAddress}`,
      transactionHash: contract.deploymentTransaction()?.hash,
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🔗 Next Steps:");
    console.log("1. Add to .env.local:");
    console.log(`   NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT=${contractAddress}`);
    console.log("2. View on block explorer:");
    console.log(`   ${deploymentInfo.blockExplorer}`);
    console.log("3. Test contract functions");
    console.log("4. Integrate with frontend");

    // Write deployment info to file
    const fs = require("fs");
    const path = require("path");
    const deploymentPath = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(deploymentPath, `verified-fitness-${Date.now()}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("💾 Deployment info saved to deployments/ folder");

    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    try {
      // Test submitting a score
      console.log("   Testing score submission...");
      const tx = await contract.submitScore(25, "pushups");
      await tx.wait();
      console.log("   ✅ Score submission successful!");

      // Check the leaderboard
      const leaderboard = await contract.getLeaderboard();
      console.log("   📊 Leaderboard entries:", leaderboard.length);

      if (leaderboard.length > 0) {
        const latestEntry = leaderboard[leaderboard.length - 1];
        console.log("   📊 Latest pushup score:", latestEntry.pushups.toString());
        console.log("   📊 Latest squat score:", latestEntry.squats.toString());
      }

      // Check user stats
      const userStats = await contract.getUserStats(deployer.address);
      console.log("   📊 User total submissions:", userStats.totalSubmissions.toString());
      console.log("   📊 User verified status:", userStats.isVerified);
    } catch (testError) {
      console.log("   ⚠️  Basic functionality test failed:", testError.message);
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
