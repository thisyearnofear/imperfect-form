export const amoyChainId = 80002;
export const baseSepoliaChainId = 84532;
export const amoyRpcUrl = "https://rpc-amoy.polygon.technology/";
export const baseSepoliaRpcUrl = "https://sepolia.base.org";

let web3;
let userAddress;
let amoyLeaderboardContract;
let baseLeaderboardContract;
let sortedPushups = [];
let sortedSquats = [];

const baseContractAddress = "0x45d1a7976477DC2cDD5d40e1e15f22138F20816F";
const amoyContractAddress = "0x6c5B97eC4E66FD3b507400BBA80898f13170943A";

const fitnessLeaderboardABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMaxScore",
        type: "uint256",
      },
    ],
    name: "MaxScorePerSubmissionChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "pushups",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "squats",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "ScoreAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newCooldown",
        type: "uint256",
      },
    ],
    name: "SubmissionCooldownChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_SCORE_PER_SUBMISSION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SUBMISSION_COOLDOWN",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_pushups",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_squats",
        type: "uint256",
      },
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getLeaderboard",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "pushups",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "squats",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        internalType: "struct FitnessLeaderboard.Score[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getTimeUntilNextSubmission",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "getUserScore",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "pushups",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "squats",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        internalType: "struct FitnessLeaderboard.Score",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastSubmissionTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "leaderboard",
    outputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "pushups",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "squats",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_maxScore",
        type: "uint256",
      },
    ],
    name: "setMaxScorePerSubmission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_cooldown",
        type: "uint256",
      },
    ],
    name: "setSubmissionCooldown",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

async function initWeb3() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
  } else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
  } else {
    console.log(
      "Non-Ethereum browser detected. You should consider trying Rabby!"
    );
    web3 = new Web3(new Web3.providers.HttpProvider(amoyRpcUrl));
  }
  await initContracts();
  await updateLeaderboard();
}

async function initContracts() {
  if (web3) {
    amoyLeaderboardContract = new web3.eth.Contract(
      fitnessLeaderboardABI, // New ABI
      amoyContractAddress // New contract address
    );
    baseLeaderboardContract = new web3.eth.Contract(
      fitnessLeaderboardABI, // New ABI
      baseContractAddress // New contract address
    );
    console.log("Contracts initialized");
  } else {
    console.error("Web3 not initialized");
  }
}

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      userAddress = accounts[0];
      console.log("Connected to wallet. User address:", userAddress);

      const networkSelect = document.getElementById("networkSelect");
      const selectedNetwork = networkSelect.value;

      if (!selectedNetwork) {
        displayError("Please select a network from the dropdown.");
        return;
      }

      const targetChainId =
        selectedNetwork === "amoy" ? amoyChainId : baseSepoliaChainId;

      const isCorrectNetwork = await checkAndSwitchNetwork(targetChainId);
      if (!isCorrectNetwork) {
        displayError(
          `Please switch to the ${
            selectedNetwork === "amoy" ? "Polygon Amoy" : "Base Sepolia"
          } Testnet`
        );
        return;
      }

      document.getElementById("connectWalletButton").style.display = "none";
      document.getElementById("submitScoreButton").style.display =
        "inline-block";

      await checkBalance();
    } catch (error) {
      console.error("Failed to connect to wallet:", error);
      displayError("Failed to connect wallet. Please try again.");
    }
  } else {
    console.log("Please install Rabby!");
    displayError("Please install Rabby to submit your score.");
  }
}

async function checkAndSwitchNetwork(targetChainId) {
  const currentChainId = await web3.eth.getChainId();
  if (currentChainId !== targetChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: web3.utils.toHex(targetChainId) }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              targetChainId === amoyChainId
                ? {
                    chainId: web3.utils.toHex(amoyChainId),
                    chainName: "Polygon Amoy Testnet",
                    nativeCurrency: {
                      name: "MATIC",
                      symbol: "MATIC",
                      decimals: 18,
                    },
                    rpcUrls: [amoyRpcUrl],
                    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
                  }
                : {
                    chainId: web3.utils.toHex(baseSepoliaChainId),
                    chainName: "Base Sepolia Testnet",
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: [baseSepoliaRpcUrl],
                    blockExplorerUrls: ["https://sepolia-explorer.base.org/"],
                  },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add the network", addError);
        }
      }
      console.error("Failed to switch network:", switchError);
    }
    return false;
  }
  return true;
}

async function checkBalance() {
  if (!userAddress) {
    console.error("Wallet not connected");
    return;
  }

  try {
    const balance = await web3.eth.getBalance(userAddress);
    const balanceInMatic = web3.utils.fromWei(balance, "ether");
    console.log("User balance:", balanceInMatic, "MATIC");

    document.getElementById("submitScoreButton").disabled = false;
  } catch (error) {
    console.error("Error checking balance:", error);
  }
}

function validateScore(pushups, squats) {
  if (pushups < 0 || squats < 0) {
    throw new Error("Scores cannot be negative.");
  }
  if (!Number.isInteger(pushups) || !Number.isInteger(squats)) {
    throw new Error("Scores must be integers.");
  }
  if (pushups === 0 && squats === 0) {
    throw new Error("At least one score must be greater than zero.");
  }
}

function displayError(message) {
  document.getElementById("submissionStatus").textContent = message;
}

async function updateLeaderboard() {
  const loadButton = document.getElementById("loadLeaderboardButton");
  loadButton.textContent = "Loading...";
  loadButton.disabled = true;

  const fallbackBaseRpcUrls = [
    "https://base-sepolia-rpc.publicnode.com",
    "https://public.stackup.sh/api/v1/node/base-sepolia",
    "https://sepolia.base.org",
  ];

  const fallbackAmoyRpcUrls = [
    "https://rpc.ankr.com/polygon_amoy",
    "https://polygon-amoy.drpc.org",
  ];

  try {
    // Fetch leaderboard data from both networks
    const amoyData = await fetchLeaderboardData(
      amoyLeaderboardContract,
      fallbackAmoyRpcUrls
    ).catch((error) => {
      console.error("Failed to fetch Amoy leaderboard data:", error);
      return [];
    });

    const baseData = await fetchLeaderboardData(
      baseLeaderboardContract,
      fallbackBaseRpcUrls
    ).catch((error) => {
      console.error("Failed to fetch Base Sepolia leaderboard data:", error);
      return [];
    });

    // Process leaderboard data
    const pushupLeaderboard = [];
    const squatLeaderboard = [];

    // sourcery skip: avoid-function-declarations-in-blocks
    function processData(data, network) {
      data.forEach((entry) => {
        if (entry.user !== "0x0000000000000000000000000000000000000000") {
          pushupLeaderboard.push({
            user: entry.user,
            score: parseInt(entry.pushups),
            network: network,
          });
          squatLeaderboard.push({
            user: entry.user,
            score: parseInt(entry.squats),
            network: network,
          });
        }
      });
    }

    processData(amoyData, "amoy");
    processData(baseData, "base");

    // Sort the entries for push-ups and squats
    sortedPushups = pushupLeaderboard.sort((a, b) => b.score - a.score);
    sortedSquats = squatLeaderboard.sort((a, b) => b.score - a.score);

    // Update the leaderboard UI with top 2 entries
    updateLeaderboardUI(sortedPushups.slice(0, 2), sortedSquats.slice(0, 2));
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    document.getElementById(
      "leaderboardBody"
    ).innerHTML = `<tr><td colspan="5">Error loading leaderboard. Please try again later.</td></tr>`;
  } finally {
    loadButton.textContent = "Load";
    loadButton.disabled = false;
  }
}

async function updateLeaderboardUI(pushupLeaderboard, squatLeaderboard) {
  const leaderboardBody = document.getElementById("leaderboardBody");
  leaderboardBody.innerHTML = ""; // Clear existing entries

  // sourcery skip: avoid-function-declarations-in-blocks
  async function displayEntries(entries, headerText, headerColor) {
    const header = document.createElement("tr");
    header.innerHTML = `<td colspan="5" style="background-color: ${headerColor}; text-align: center;">${headerText}</td>`;
    leaderboardBody.appendChild(header);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const ensName = await resolveENSName(entry.user).catch(() => null);
      const displayName = ensName || shortenAddress(entry.user);
      const row = document.createElement("tr");
      row.className = entry.network === "amoy" ? "pink-entry" : "blue-entry";
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${displayName}</td>
        <td>${entry.score}</td>
        <td>${entry.network === "amoy" ? "Polygon" : "Base"}</td>
      `;
      leaderboardBody.appendChild(row);
    }
  }

  await displayEntries(pushupLeaderboard, "Push-ups", "#fcb131");
  await displayEntries(squatLeaderboard, "Squats", "#00a651");

  // Update global variables for expanded leaderboard
  window.sortedPushups = pushupLeaderboard;
  window.sortedSquats = squatLeaderboard;
}

async function fetchLeaderboardData(contract, fallbackRpcUrls) {
  for (const rpcUrl of fallbackRpcUrls) {
    try {
      console.log(`Trying to fetch data from ${rpcUrl}`);
      const provider = new Web3.providers.HttpProvider(rpcUrl);
      const web3 = new Web3(provider);
      const contractInstance = new web3.eth.Contract(
        contract.options.jsonInterface,
        contract.options.address
      );
      const data = await contractInstance.methods.getLeaderboard().call(); // Updated method call
      console.log(`Successfully fetched data from ${rpcUrl}`);
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${rpcUrl}:`, error);
    }
  }
  throw new Error("All RPC URLs failed");
}

async function showExpandedLeaderboard() {
  const expandedLeaderboardBody = document.getElementById(
    "expandedLeaderboardBody"
  );
  expandedLeaderboardBody.innerHTML = ""; // Clear existing entries

  // Create headers for the expanded leaderboard
  const pushupHeader = document.createElement("h3");
  pushupHeader.textContent = "Top Push-ups";
  expandedLeaderboardBody.appendChild(pushupHeader);

  // Display top push-up entries
  for (let i = 0; i < Math.min(sortedPushups.length, 5); i++) {
    const entry = sortedPushups[i];
    const ensName = await resolveENSName(entry.user).catch(() => null);
    const displayName = ensName || shortenAddress(entry.user);
    const row = document.createElement("div");
    row.innerHTML = `${i + 1}. ${displayName} - ${entry.score} (${
      entry.network === "amoy" ? "Polygon" : "Base"
    })`;
    expandedLeaderboardBody.appendChild(row);
  }

  // Create headers for squats
  const squatHeader = document.createElement("h3");
  squatHeader.textContent = "Top Squats";
  expandedLeaderboardBody.appendChild(squatHeader);

  // Display top squat entries
  for (let i = 0; i < Math.min(sortedSquats.length, 5); i++) {
    const entry = sortedSquats[i];
    const ensName = await resolveENSName(entry.user).catch(() => null);
    const displayName = ensName || shortenAddress(entry.user);
    const row = document.createElement("div");
    row.innerHTML = `${i + 1}. ${displayName} - ${entry.score} (${
      entry.network === "amoy" ? "Polygon" : "Base"
    })`;
    expandedLeaderboardBody.appendChild(row);
  }

  // Show the modal
  document.getElementById("expandedLeaderboardModal").style.display = "block";
}

// Add event listener for the expand button
document
  .getElementById("view-more-button")
  .addEventListener("click", showExpandedLeaderboard);

async function resolveENSName(address) {
  try {
    // Attempt to resolve ENS name using the ENS Data API directly
    // sourcery skip: inline-immediately-returned-variable
    const ensName = await resolveENSNameFallback(address);
    return ensName;
  } catch (error) {
    console.error("Error resolving ENS name:", error);
    return shortenAddress(address); // Fallback to shortened address if both methods fail
  }
}

async function resolveENSNameFallback(address) {
  try {
    const response = await fetch(`https://api.ensdata.net/${address}`);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.json();
    return data.ens_primary || null; // Return the ENS name or null
  } catch (error) {
    console.error(`Error resolving ENS name for address ${address}:`, error);
    return null; // Return null if there's an error
  }
}

function shortenAddress(address) {
  return `${address.substr(0, 6)}...${address.substr(-4)}`;
}

async function submitScore() {
  if (!userAddress) {
    await connectWallet();
  }

  if (!userAddress) {
    displayError(
      "Wallet not connected. Please connect your wallet and try again."
    );
    return;
  }

  const networkSelect = document.getElementById("networkSelect");
  const selectedNetwork = networkSelect.value;

  if (!selectedNetwork) {
    displayError("Please select a network from the dropdown.");
    return;
  }

  const targetChainId =
    selectedNetwork === "amoy" ? amoyChainId : baseSepoliaChainId;
  const contract =
    selectedNetwork === "amoy"
      ? amoyLeaderboardContract
      : baseLeaderboardContract;

  const isCorrectNetwork = await checkAndSwitchNetwork(targetChainId);
  if (!isCorrectNetwork) {
    displayError(
      `Please switch to the ${
        selectedNetwork === "amoy" ? "Polygon Amoy" : "Base Sepolia"
      } Testnet before submitting`
    );
    return;
  }

  // Use the global reps variable from webcam.js
  const pushups = exerciseMode === "pushups" ? reps : 0;
  const squats = exerciseMode === "squats" ? reps : 0;

  // Log the values of pushups and squats for debugging
  console.log(`Pushups: ${pushups}, Squats: ${squats}`);

  try {
    // Validate the scores
    validateScore(pushups, squats);

    const submissionStatus = document.getElementById("submissionStatus");

    // Show warning message
    if (!submissionStatus.classList.contains("warning")) {
      submissionStatus.textContent = "Click submit again to proceed.";
      submissionStatus.classList.add("warning");
      return;
    }

    // Show processing message
    submissionStatus.textContent = "Processing transaction...";
    submissionStatus.classList.remove("warning");
    submissionStatus.classList.add("processing");

    // Disable the submit button
    const submitButton = document.getElementById("submitScoreButton");
    submitButton.disabled = true;

    const gasEstimate = await contract.methods
      .addScore(pushups, squats)
      .estimateGas({ from: userAddress });

    const result = await contract.methods.addScore(pushups, squats).send({
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer to gas estimate
    });

    console.log("Transaction result:", result);
    submissionStatus.textContent = "Score submitted successfully!";
    submissionStatus.classList.remove("processing");

    // Disable further interaction with the submit button
    submitButton.disabled = true;

    // Close the modal
    document.getElementById("expandedLeaderboardModal").style.display = "none";

    await updateLeaderboard();
  } catch (error) {
    console.error("Error submitting score:", error);
    displayError(`Error submitting score: ${error.message}. Please try again.`);
    const submissionStatus = document.getElementById("submissionStatus");
    submissionStatus.classList.remove("processing");
    submissionStatus.textContent = "";
    const submitButton = document.getElementById("submitScoreButton");
    submitButton.disabled = false;
  }
}

// Initialize Web3 when the page loads
window.addEventListener("load", async () => {
  await initWeb3();
});

// Add event listeners
document
  .getElementById("connectWalletButton")
  .addEventListener("click", connectWallet);
document
  .getElementById("submitScoreButton")
  .addEventListener("click", submitScore);
document
  .getElementById("loadLeaderboardButton")
  .addEventListener("click", updateLeaderboard);

// Export functions for testing purposes
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initWeb3,
    connectWallet,
    submitScore,
    updateLeaderboard,
    checkBalance,
    validateScore,
    formatScore,
  };
}
