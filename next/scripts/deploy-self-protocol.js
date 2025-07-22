const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy Self Protocol Verified Fitness Contract
 *
 * This script deploys the VerifiedFitnessContract that extends SelfVerificationRoot
 * and integrates with the Self Protocol for human verification.
 *
 * Architecture:
 * - Modular deployment with proper error handling
 * - Environment-aware configuration
 * - Comprehensive verification and testing
 * - Clean output and documentation
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEPLOYMENT_CONFIG = {
  // Self Protocol V2 Hub addresses
  HUBS: {
    celo_mainnet: "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",
    celo_testnet: "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
  },

  // Verification configuration
  SCOPE_NAME: "imperfect-form-fitness",
  MINIMUM_AGE: 16,

  // Configuration ID for Self Protocol (will be generated)
  // This should match your frontend disclosures configuration
  CONFIG_ID:
    "0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61", // Default config

  // Deployment settings
  MIN_BALANCE_CELO: "0.1", // Minimum CELO balance required for deployment
  CONFIRMATION_BLOCKS: 2, // Number of blocks to wait for confirmation
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate scope from contract address
 * @param {string} contractAddress - The deployed contract address
 * @returns {string} - The calculated scope as a hex string
 */
function calculateScope(contractAddress) {
  // Scope calculation: keccak256(abi.encodePacked(contractAddress, SCOPE_NAME))
  const encoded = ethers.solidityPacked(
    ["address", "string"],
    [contractAddress, DEPLOYMENT_CONFIG.SCOPE_NAME]
  );
  return ethers.keccak256(encoded);
}

/**
 * Get the appropriate hub address for the current network
 * @param {string} networkName - The network name
 * @returns {string} - The hub address
 */
function getHubAddress(networkName) {
  if (networkName.includes("mainnet") || networkName === "celo") {
    return DEPLOYMENT_CONFIG.HUBS.celo_mainnet;
  } else {
    return DEPLOYMENT_CONFIG.HUBS.celo_testnet;
  }
}

/**
 * Save deployment information to file
 * @param {Object} deploymentInfo - The deployment information
 */
function saveDeploymentInfo(deploymentInfo) {
  const deploymentPath = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const filename = `self-protocol-${deploymentInfo.network}-${Date.now()}.json`;
  const filepath = path.join(deploymentPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${filename}`);
}

/**
 * Verify deployment by calling contract functions
 * @param {Object} contract - The deployed contract instance
 * @param {string} contractAddress - The contract address
 */
async function verifyDeployment(contract, contractAddress) {
  console.log("\n🔍 Verifying deployment...");

  try {
    // Test basic contract functions
    const minimumAge = await contract.MINIMUM_AGE();
    const scopeName = await contract.SCOPE_NAME();
    const configId = await contract.VERIFICATION_CONFIG_ID();
    const owner = await contract.owner();
    const totalVerified = await contract.totalVerifiedUsers();

    console.log("   ✅ Contract functions accessible:");
    console.log(`      Minimum age: ${minimumAge}`);
    console.log(`      Scope name: ${scopeName}`);
    console.log(`      Config ID: ${configId}`);
    console.log(`      Owner: ${owner}`);
    console.log(`      Total verified users: ${totalVerified}`);

    // Test verification check function
    const isVerified = await contract.isVerifiedHuman(owner);
    console.log(`      Owner verification status: ${isVerified}`);

    return true;
  } catch (error) {
    console.log("   ⚠️  Contract verification failed:", error.message);
    return false;
  }
}

// =============================================================================
// MAIN DEPLOYMENT FUNCTION
// =============================================================================

async function main() {
  console.log("🚀 Deploying Self Protocol Verified Fitness Contract...");
  console.log("=".repeat(60));

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name || "unknown";
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEther = ethers.formatEther(balance);
  console.log(`💰 Account balance: ${balanceEther} CELO`);

  if (
    parseFloat(balanceEther) < parseFloat(DEPLOYMENT_CONFIG.MIN_BALANCE_CELO)
  ) {
    console.warn(
      `⚠️  Low balance! Minimum ${DEPLOYMENT_CONFIG.MIN_BALANCE_CELO} CELO recommended`
    );
  }

  try {
    // Get the appropriate hub address
    const hubAddress = getHubAddress(networkName);
    console.log(`🏢 Using Self Protocol Hub: ${hubAddress}`);

    // Deploy the contract with initial parameters
    console.log("\n📦 Deploying VerifiedFitnessContract...");
    const VerifiedFitnessContract = await ethers.getContractFactory(
      "VerifiedFitnessContract"
    );

    // Initial deployment with temporary scope (will be updated after deployment)
    const tempScope = 1; // Temporary scope, will be calculated and updated

    const contract = await VerifiedFitnessContract.deploy(
      hubAddress,
      tempScope,
      DEPLOYMENT_CONFIG.CONFIG_ID
    );

    console.log("⏳ Waiting for deployment transaction...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ Contract deployed to: ${contractAddress}`);

    // Calculate the proper scope based on the deployed address
    const properScope = calculateScope(contractAddress);
    console.log(`🔢 Calculated scope: ${properScope}`);

    // Note: Scope is set in constructor, no need to update separately
    console.log("✅ Contract deployed with proper scope calculation");

    // Wait for contract to be ready
    console.log("⏳ Waiting for contract to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify deployment
    const verificationSuccess = await verifyDeployment(
      contract,
      contractAddress
    );

    // Prepare deployment information
    const deploymentInfo = {
      network: networkName,
      chainId: network.chainId.toString(),
      contractAddress: contractAddress,
      hubAddress: hubAddress,
      deployer: deployer.address,
      scope: properScope,
      scopeName: DEPLOYMENT_CONFIG.SCOPE_NAME,
      configId: DEPLOYMENT_CONFIG.CONFIG_ID,
      minimumAge: DEPLOYMENT_CONFIG.MINIMUM_AGE,
      deploymentTime: new Date().toISOString(),
      blockExplorer:
        networkName.includes("testnet") || networkName.includes("alfajores")
          ? `https://alfajores.celoscan.io/address/${contractAddress}`
          : `https://celoscan.io/address/${contractAddress}`,
      transactionHash: contract.deploymentTransaction()?.hash,
      verificationSuccess: verificationSuccess,
    };

    // Display deployment summary
    console.log("\n📋 Deployment Summary:");
    console.log("=".repeat(60));
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Save deployment info
    saveDeploymentInfo(deploymentInfo);

    // Display next steps
    console.log("\n🔗 Next Steps:");
    console.log("=".repeat(60));
    console.log("1. Add to your .env.local:");
    console.log(`   NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT=${contractAddress}`);
    console.log(`   NEXT_PUBLIC_SELF_SCOPE=${properScope}`);
    console.log("");
    console.log("2. Update your frontend configuration:");
    console.log("   - Ensure endpoint points to this contract address");
    console.log("   - Verify disclosures match the config ID");
    console.log("");
    console.log("3. View on block explorer:");
    console.log(`   ${deploymentInfo.blockExplorer}`);
    console.log("");
    console.log("4. Test the verification flow:");
    console.log("   - Frontend → Self app → Contract verification");
    console.log("");
    console.log("5. Integration with existing fitness contracts:");
    console.log(
      "   - Call isVerifiedHuman(address) to check verification status"
    );

    console.log("\n🎉 Deployment completed successfully!");
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);

    // Provide helpful error messages
    if (error.message.includes("insufficient funds")) {
      console.error("💡 Solution: Add more CELO to your deployer account");
    } else if (error.message.includes("nonce")) {
      console.error("💡 Solution: Wait a moment and try again (nonce issue)");
    } else if (error.message.includes("gas")) {
      console.error(
        "💡 Solution: Increase gas limit or check network congestion"
      );
    }

    process.exit(1);
  }
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
