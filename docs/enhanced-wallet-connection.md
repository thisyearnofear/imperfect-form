# Enhanced Wallet Connection System

## Overview

The Enhanced Wallet Connection system provides robust wallet connectivity with automatic fallbacks, specifically designed to handle Farcaster auto-connection scenarios and other challenging environments.

## Key Features

- **Farcaster-First**: Prioritizes Farcaster SDK providers for auto-connected users
- **WalletConnect Fallback**: Graceful degradation when primary connections fail
- **Enhanced Error Handling**: User-friendly error messages with recovery suggestions
- **Transaction Readiness**: Validates providers before allowing transaction submission
- **Environment Detection**: Handles platform-specific issues (Brave, Farcaster, etc.)

## Architecture

### Core Components

1. **Enhanced Wallet Provider** (`utils/enhancedWalletProvider.ts`)
   - Provider detection and validation
   - WalletConnect initialization
   - Network switching
   - Error handling utilities

2. **Enhanced Wallet Connection Hook** (`hooks/useEnhancedWalletConnection.ts`)
   - React-friendly state management
   - Auto-connection logic
   - Manual connection methods
   - Transaction readiness validation

3. **Wallet Connection Troubleshooter** (`components/wallet/WalletConnectionTroubleshooter.tsx`)
   - User-facing troubleshooting interface
   - Environment-specific guidance
   - Multiple connection attempt methods

4. **Enhanced Direct Submission** (`utils/directSubmission.ts`)
   - Updated to use enhanced providers
   - Better error handling
   - Automatic fallback mechanisms

## Usage

### Basic Hook Usage

```typescript
import { useEnhancedWalletConnection } from '@/hooks/useEnhancedWalletConnection';

function MyComponent() {
  const [wallet, actions] = useEnhancedWalletConnection();

  // Auto-connection happens automatically on mount

  const handleManualConnect = async () => {
    const success = await actions.connect();
    if (!success) {
      // Try WalletConnect fallback
      await actions.connect(true);
    }
  };

  return (
    <div>
      <p>Status: {wallet.isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Source: {wallet.source}</p>
      <p>Address: {wallet.address}</p>

      {!wallet.isConnected && (
        <button onClick={handleManualConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Transaction-Ready Usage

```typescript
import { useWalletForTransactions } from '@/hooks/useEnhancedWalletConnection';

function TransactionComponent() {
  const { provider, isReady, ensureReady, switchChain } = useWalletForTransactions();

  const handleTransaction = async () => {
    // Ensure wallet is ready for transactions
    const ready = await ensureReady();
    if (!ready) {
      console.error('Wallet not ready for transactions');
      return;
    }

    // Switch to correct network if needed
    await switchChain(42220); // Celo

    // Use provider for transaction
    const signer = await provider.getSigner();
    // ... perform transaction
  };

  return (
    <button
      onClick={handleTransaction}
      disabled={!isReady}
    >
      Submit Transaction
    </button>
  );
}
```

### Troubleshooter Component

```typescript
import { WalletConnectionTroubleshooter } from '@/components/wallet';

function MyApp() {
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  return (
    <div>
      {showTroubleshooter && (
        <WalletConnectionTroubleshooter
          onSuccess={() => setShowTroubleshooter(false)}
          onCancel={() => setShowTroubleshooter(false)}
        />
      )}
    </div>
  );
}
```

## Connection Strategy

The system attempts connections in this order:

1. **Farcaster Provider** (if in Farcaster context)
   - Uses new `getEthereumProvider()` API
   - Fallback to legacy `ethProvider`
   - Minimal validation to avoid false negatives

2. **Injected Provider** (MetaMask, Coinbase, etc.)
   - Standard `window.ethereum` detection
   - Basic functionality validation

3. **WalletConnect** (fallback)
   - Initializes WalletConnect modal
   - Supports QR code and deep linking
   - Works across all environments

4. **Fallback Provider** (last resort)
   - Returns basic injected provider even if not ready
   - Allows manual connection attempts

## Error Handling

### Error Types

- `PROVIDER_NOT_READY`: Provider exists but needs initialization
- `USER_REJECTED`: User denied transaction/connection
- `SESSION_ERROR`: WalletConnect or provider session issues
- `NETWORK_ERROR`: RPC or connectivity problems
- `INSUFFICIENT_FUNDS`: Self-explanatory
- `UNKNOWN_ERROR`: Catch-all for unexpected issues

### Error Recovery

Each error type includes:

- User-friendly message
- Recovery suggestion
- Fallback method recommendation
- Platform-specific guidance

## Environment Handling

### Farcaster Mini Apps

- Prioritizes Farcaster SDK providers
- Handles auto-connection scenarios
- Provides specific error messages
- Falls back to WalletConnect for problematic cases

### Brave Browser

- Detects Brave-specific issues
- Recommends WalletConnect for privacy conflicts
- Extended timeouts for provider detection

### Desktop/Mobile Web

- Standard injected wallet detection
- WalletConnect as primary fallback
- Cross-platform compatibility

## Configuration

### Environment Variables

```env
# Required for WalletConnect fallback
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Custom error reporting
NEXT_PUBLIC_REMOTE_LOGGING_ENABLED=true
```

### WalletConnect Setup

1. Get project ID from [WalletConnect Dashboard](https://dashboard.walletconnect.com)
2. Add to environment variables
3. Configure supported chains in `enhancedWalletProvider.ts`

## Migration Guide

### From Direct `window.ethereum` Usage

```typescript
// Before
if (!window.ethereum) {
  throw new Error('No wallet provider');
}
const provider = new ethers.BrowserProvider(window.ethereum);

// After
import { getTransactionReadyProvider } from '@/utils/enhancedWalletProvider';

const walletProvider = await getTransactionReadyProvider();
if (!walletProvider) {
  throw new Error('No wallet provider available');
}
const provider = walletProvider.provider;
```

### From Basic Wagmi Usage

```typescript
// Before
const { isConnected, address } = useAccount();

// After
const [wallet] = useEnhancedWalletConnection();
const { isConnected, address } = wallet;
```

## Troubleshooting

### Common Issues

1. **"Provider not ready" in Farcaster**
   - Ensure wallet is connected in main Farcaster app
   - Try WalletConnect fallback
   - Check Farcaster app permissions

2. **WalletConnect session errors**
   - Clear browser storage
   - Use cleanup function
   - Reinitialize connection

3. **Brave browser issues**
   - Adjust Shield settings
   - Use WalletConnect exclusively
   - Check extension conflicts

### Debug Information

Enable debug logging:

```typescript
localStorage.setItem('debug', 'EnhancedWallet*');
```

Check wallet state:

```typescript
const [wallet] = useEnhancedWalletConnection();
console.log('Wallet debug:', {
  isConnected: wallet.isConnected,
  isReady: wallet.isReady,
  source: wallet.source,
  error: wallet.error,
  supportsWalletConnect: wallet.supportsWalletConnect,
});
```

## Best Practices

1. **Always check readiness before transactions**

   ```typescript
   await actions.ensureReady();
   ```

2. **Provide fallback options**

   ```typescript
   if (!(await actions.connect())) {
     await actions.connect(true); // Try WalletConnect
   }
   ```

3. **Handle errors gracefully**

   ```typescript
   if (wallet.error?.recoverable) {
     // Show retry option
   } else {
     // Show alternative connection methods
   }
   ```

4. **Use appropriate components**
   - `useEnhancedWalletConnection` for full control
   - `useWalletForTransactions` for transaction focus
   - `WalletConnectionTroubleshooter` for user support

## Performance Considerations

- Auto-connection runs once on mount
- Provider validation is lightweight
- WalletConnect initializes only when needed
- Cleanup functions prevent memory leaks
- State updates are optimized for React

## Security Considerations

- Provider validation prevents malicious injections
- WalletConnect uses official SDK with security best practices
- Error messages don't expose sensitive information
- Session cleanup prevents data persistence issues
- Network validation ensures correct chain usage
