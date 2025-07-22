const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing deployment to Celo Alfajores...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "CELO");
  
  const SimpleTest = await ethers.getContractFactory("SimpleTest");
  const contract = await SimpleTest.deploy();
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("✅ SimpleTest deployed to:", address);
  console.log("🔗 View at: https://alfajores.celoscan.io/address/" + address);
  
  // Test the contract
  const message = await contract.message();
  console.log("📄 Contract message:", message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});