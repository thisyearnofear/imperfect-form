# Unified Wallet System

## Overview

Following our core principles of **AGGRESSIVE CONSOLIDATION** and **DRY**, we've unified the wallet connection system into a single, clean architecture.

## Architecture

### Single Source of Truth: PlatformContext

All wallet functionality flows through `PlatformContext.tsx`:

- **Connection Management**: Wagmi-based with Farcaster support
- **State Management**: Unified wallet state across the app
- **Network Switching**: Direct ethereum provider calls
- **Error Handling**: Simplified, user-friendly messages

### Core Components

1. **PlatformContext** (`src/contexts/PlatformContext.tsx`)
   - Unified wallet state management
   - Platform detection (Farcaster, mobile, desktop, PWA)
   - Wagmi integration with Farcaster connector

2. **SubmitScore** (`src/components/game/SubmitScore.tsx`)
   - Clean score submission component
   - Uses PlatformContext for wallet state
   - Direct ethers.js integration

3. **Direct Submission** (`src/utils/directSubmission.ts`)
   - Simplified transaction handling
   - Direct `window.ethereum` usage (same as Wagmi)
   - Network switching and error handling

## Usage

### Basic Wallet Connection

```typescript
import { usePlatform } from '@/contexts/PlatformContext';

function MyComponent() {
  const { wallet, actions } = usePlatform();

  // Check connection status
  if (!wallet.isConnected) {
    return <button onClick={() => actions.connect()}>Connect Wallet</button>;
  }

  // Use wallet data
  return <div>Connected: {wallet.address}</div>;
}
```

### Score Submission

```typescript
import { SubmitScore } from '@/components/game';

function GameComponent() {
  const [submissionStatus, setSubmissionStatus] = useState('idle');

  return (
    <SubmitScore
      pushupsScore={25}
      squatsScore={30}
      submissionStatus={submissionStatus}
      setSubmissionStatus={setSubmissionStatus}
    />
  );
}
```

### Network Switching

```typescript
import { usePlatform } from '@/contexts/PlatformContext';

function NetworkSwitcher() {
  const { actions } = usePlatform();

  const switchToCelo = () => actions.switchChain(42220);
  const switchToBase = () => actions.switchChain(8453);

  return (
    <div>
      <button onClick={switchToCelo}>Switch to Celo</button>
      <button onClick={switchToBase}>Switch to Base</button>
    </div>
  );
}
```

## Benefits of Consolidation

### ✅ What We Eliminated

- **Dual wallet systems** - No more confusion between Enhanced and Wagmi
- **Complex provider detection** - Direct `window.ethereum` usage
- **Redundant error handling** - Simplified, user-friendly messages
- **Multiple state sources** - Single source of truth in PlatformContext
- **Unnecessary abstractions** - Direct ethers.js integration

### ✅ What We Gained

- **Single responsibility** - Each component has one clear purpose
- **Predictable behavior** - Same provider used throughout (window.ethereum)
- **Easier debugging** - Clear data flow through PlatformContext
- **Better performance** - Removed redundant provider detection
- **Cleaner code** - Removed 500+ lines of redundant code

## Supported Platforms

- **Farcaster Mini Apps** - Auto-detection and connection
- **Desktop Browsers** - MetaMask, Coinbase Wallet, WalletConnect
- **Mobile Browsers** - In-app wallet browsers
- **PWA** - Progressive Web App support

## Error Handling

Simplified error messages:

- "Transaction rejected" - User declined transaction
- "Insufficient funds" - Not enough balance
- "Network error" - Connection issues
- "No wallet provider" - Wallet not connected

## Migration Notes

### Before (Dual System)

```typescript
// Complex dual system
const [enhancedWallet, enhancedActions] = useEnhancedWalletConnection();
const { wallet } = usePlatform();
const address = enhancedWallet.address || wallet.address; // Confusing!
```

### After (Unified System)

```typescript
// Clean unified system
const { wallet } = usePlatform();
const address = wallet.address; // Clear!
```

## File Structure

```
src/
├── contexts/
│   └── PlatformContext.tsx          # Unified wallet state
├── components/
│   └── game/
│       └── SubmitScore.tsx          # Clean submission component
└── utils/
    └── directSubmission.ts          # Simplified transaction handling
```

## Testing

The unified system is easier to test:

1. **Connect wallet** through normal flow
2. **Submit score** - should work without "no wallet provider" errors
3. **Switch networks** - direct ethereum provider calls
4. **Error handling** - simplified, user-friendly messages

## Maintenance

With the unified system:

- **Single point of truth** for wallet state
- **Predictable behavior** across all components
- **Easy to extend** with new features
- **Clear separation** of concerns
