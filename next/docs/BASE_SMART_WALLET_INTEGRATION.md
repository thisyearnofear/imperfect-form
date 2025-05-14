# Base Smart Wallet Integration - Simplified Approach

This document outlines a simplified approach for integrating Base Smart Wallet with Sub Accounts in the Imperfect Form application.

## Overview

Base Smart Wallet is a self-custodial wallet solution that uses passkeys for authentication, providing enhanced security and user experience. Instead of trying to make two different wallet providers coexist in the same application (which causes React hook conflicts and performance issues), we'll implement a network selector approach.

## Key Design Principles

1. **Separation of Concerns**: Keep wallet providers completely separate
2. **Network-First Approach**: Users select a network first, which determines the wallet provider
3. **No Provider Nesting**: Avoid nesting providers to prevent React hook conflicts
4. **Minimal State Management**: Use simple state management with localStorage

## Implementation Approach

### 1. Network Selection Component

Instead of a wallet mode toggle, we'll implement a network selection component that appears before wallet connection:

```tsx
// NetworkSelector.tsx
export default function NetworkSelector({ onNetworkSelected }) {
  return (
    <Dialog title="Select Network" isOpen={true} onClose={() => {}}>
      <div className="network-options">
        <button
          onClick={() => onNetworkSelected("polygon")}
          className="network-option-polygon"
        >
          <img src="/polygon-logo.svg" alt="Polygon" />
          <span>Polygon</span>
        </button>

        <button
          onClick={() => onNetworkSelected("base")}
          className="network-option-base"
        >
          <img src="/base-logo.svg" alt="Base" />
          <span>Base Sepolia</span>
        </button>
      </div>
    </Dialog>
  );
}
```

### 2. App-Level Network State

Manage network selection at the app level with a simple context:

```tsx
// NetworkContext.tsx
import { createContext, useState, useContext, useEffect } from "react";

type Network = "polygon" | "base" | null;

const NetworkContext = createContext<{
  network: Network;
  setNetwork: (network: Network) => void;
}>({
  network: null,
  setNetwork: () => {},
});

export function NetworkProvider({ children }) {
  // Initialize from localStorage if available
  const [network, setNetwork] = useState<Network>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem("selectedNetwork") as Network) || null;
  });

  // Persist network selection to localStorage
  useEffect(() => {
    if (network) {
      localStorage.setItem("selectedNetwork", network);
    }
  }, [network]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
```

### 3. Conditional Provider Rendering

Render the appropriate provider based on the selected network:

```tsx
// AppProviders.tsx
export default function AppProviders({ children }) {
  const { network } = useNetwork();

  // If no network is selected, show network selector
  if (!network) {
    return (
      <NetworkSelector onNetworkSelected={(network) => setNetwork(network)} />
    );
  }

  // Render the appropriate provider based on the selected network
  if (network === "base") {
    return (
      <WagmiConfig config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiConfig>
    );
  }

  // Default to ThirdWeb for Polygon
  return (
    <ThirdwebProvider
      activeChain={customChains.amoy}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
    >
      {children}
    </ThirdwebProvider>
  );
}
```

### 4. Network-Specific Wallet Components

Create separate wallet components for each network:

```tsx
// WalletButton.tsx
export default function WalletButton() {
  const { network } = useNetwork();

  if (network === "base") {
    return <BaseWalletButton />;
  }

  return <PolygonWalletButton />;
}

// BaseWalletButton.tsx - Uses Wagmi/ConnectKit
function BaseWalletButton() {
  const { address } = useAccount();
  const { connect } = useConnect({
    connector: coinbaseWallet({
      appName: "Imperfect Form",
      preference: "smartWalletOnly",
    }),
  });
  const { disconnect } = useDisconnect();

  if (address) {
    return (
      <button onClick={() => disconnect()}>{shortenAddress(address)}</button>
    );
  }

  return <button onClick={() => connect()}>Connect Base Wallet</button>;
}

// PolygonWalletButton.tsx - Uses ThirdWeb
function PolygonWalletButton() {
  return <ConnectWallet theme="dark" btnTitle="Connect Polygon Wallet" />;
}
```

### 5. Network-Specific Contract Interactions

Create separate components for contract interactions:

```tsx
// SubmitScoreButton.tsx
export default function SubmitScoreButton({ pushups, squats }) {
  const { network } = useNetwork();

  if (network === "base") {
    return <BaseSubmitScore pushups={pushups} squats={squats} />;
  }

  return <PolygonSubmitScore pushups={pushups} squats={squats} />;
}

// BaseSubmitScore.tsx - Uses Wagmi
function BaseSubmitScore({ pushups, squats }) {
  const { writeAsync, isLoading } = useContractWrite({
    address: BASE_CONTRACT_ADDRESS,
    abi: fitnessLeaderboardABI,
    functionName: "addScore",
  });

  const handleSubmit = async () => {
    try {
      await writeAsync({ args: [BigInt(pushups), BigInt(squats)] });
      toast.success("Score submitted to Base Sepolia!");
    } catch (error) {
      toast.error("Failed to submit score");
      console.error(error);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="base-submit-button"
    >
      {isLoading ? "Submitting..." : "Submit to Base"}
    </button>
  );
}

// PolygonSubmitScore.tsx - Uses ThirdWeb
function PolygonSubmitScore({ pushups, squats }) {
  const { contract } = useContract(POLYGON_CONTRACT_ADDRESS);
  const { mutateAsync, isLoading } = useContractWrite(contract, "addScore");

  const handleSubmit = async () => {
    try {
      await mutateAsync({ args: [pushups, squats] });
      toast.success("Score submitted to Polygon!");
    } catch (error) {
      toast.error("Failed to submit score");
      console.error(error);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="polygon-submit-button"
    >
      {isLoading ? "Submitting..." : "Submit to Polygon"}
    </button>
  );
}
```

### 6. Leaderboard Component

The leaderboard component will use ethers.js directly to fetch data from both networks:

```tsx
// Leaderboard.tsx
export default function Leaderboard() {
  const [polygonScores, setPolygonScores] = useState([]);
  const [baseScores, setBaseScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboards() {
      setIsLoading(true);

      try {
        // Fetch Polygon scores using ethers.js
        const polygonProvider = new ethers.providers.JsonRpcProvider(
          POLYGON_RPC_URL
        );
        const polygonContract = new ethers.Contract(
          POLYGON_CONTRACT_ADDRESS,
          fitnessLeaderboardABI,
          polygonProvider
        );
        const polygonData = await polygonContract.getLeaderboard();
        setPolygonScores(formatScores(polygonData, "polygon"));

        // Fetch Base scores using ethers.js
        const baseProvider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
        const baseContract = new ethers.Contract(
          BASE_CONTRACT_ADDRESS,
          fitnessLeaderboardABI,
          baseProvider
        );
        const baseData = await baseContract.getLeaderboard();
        setBaseScores(formatScores(baseData, "base"));
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboards();
  }, []);

  // Format and display the combined leaderboard
  // ...
}
```

## Implementation Steps

1. **Create Network Context**: Implement the NetworkContext for managing network selection
2. **Create Network Selector**: Build the network selection UI
3. **Implement Base Wallet Integration**: Create the Base-specific wallet components using Wagmi/ConnectKit
4. **Implement Polygon Wallet Integration**: Create the Polygon-specific wallet components using ThirdWeb
5. **Create Contract Interaction Components**: Implement network-specific contract interaction components
6. **Update Leaderboard**: Modify the leaderboard to fetch data from both networks using ethers.js
7. **Integrate with Game Component**: Update the Game component to use the new network-aware components

## Benefits of This Approach

- **No Provider Conflicts**: By avoiding nested providers, we eliminate React hook conflicts
- **Better Performance**: Each network uses its own dedicated provider without interference
- **Simpler Mental Model**: Network selection is a more intuitive approach than wallet mode toggling
- **Easier Maintenance**: Cleaner separation of concerns makes the code easier to maintain
- **Future Extensibility**: Adding support for additional networks becomes straightforward

## Resources

- [Base Smart Wallet Documentation](https://docs.base.org/identity/smart-wallet/)
- [Sub Accounts Guide](https://docs.base.org/identity/smart-wallet/guides/sub-accounts/)
- [Spend Limits Guide](https://docs.base.org/identity/smart-wallet/guides/spend-limits/)
- [Wagmi Documentation](https://wagmi.sh/)
- [ConnectKit Documentation](https://docs.family.co/connectkit)
- [ThirdWeb Documentation](https://portal.thirdweb.com/)
