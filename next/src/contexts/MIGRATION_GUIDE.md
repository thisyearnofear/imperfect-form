# Platform Context Migration Guide

## Overview

We've consolidated multiple overlapping contexts into a single, unified `PlatformContext` that provides:
- ✅ Better performance (fewer re-renders)
- ✅ Cleaner code (DRY principles)
- ✅ Unified API across all platforms
- ✅ Type safety
- ✅ Automatic platform detection

## Before vs After

### Before (Multiple Contexts)
```typescript
// Multiple imports needed
import { useUniversalWallet } from "@/components/providers/AppProviders";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useMiniApp } from "@/contexts/MiniAppContext";
import { useWalletProvider } from "@/components/wallet/LegacyStubs";

// Multiple hooks in component
const { isConnected, address, chainId } = useUniversalWallet();
const { isInMiniApp, user } = useFarcasterContext();
const { canShare, shareWorkout } = useMiniApp();
const { walletProvider } = useWalletProvider();
```

### After (Single Context)
```typescript
// Single import
import { usePlatform, useWallet, usePlatformFeatures } from "@/contexts/PlatformContext";

// Single hook with everything
const { platform, wallet, user, features, actions } = usePlatform();

// Or use convenience hooks
const { isConnected, address, chainId, connect, disconnect } = useWallet();
const { canShare, share } = usePlatformFeatures();
```

## Migration Steps

### 1. Replace Provider in your app root

**Before:**
```typescript
// In your app layout or _app.tsx
import AppProviders from "@/components/providers/AppProviders";

export default function RootLayout({ children }) {
  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
}
```

**After:**
```typescript
// In your app layout or _app.tsx
import SimplifiedAppProviders from "@/components/providers/SimplifiedAppProviders";

export default function RootLayout({ children }) {
  return (
    <SimplifiedAppProviders>
      {children}
    </SimplifiedAppProviders>
  );
}
```

### 2. Update Component Imports

**Before:**
```typescript
import { useUniversalWallet } from "@/components/providers/AppProviders";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useMiniApp } from "@/contexts/MiniAppContext";
```

**After:**
```typescript
import { usePlatform, useWallet, usePlatformFeatures } from "@/contexts/PlatformContext";
```

### 3. Update Hook Usage

#### Wallet Operations
**Before:**
```typescript
const { isConnected, address, chainId, connect, disconnect, switchToOptimalChain } = useUniversalWallet();
const { isInMiniApp, walletAddress } = useFarcasterContext();
```

**After:**
```typescript
const { wallet, actions } = usePlatform();
// or
const { isConnected, address, chainId, connect, disconnect, switchChain } = useWallet();
```

#### Platform Detection
**Before:**
```typescript
const { isInMiniApp } = useFarcasterContext();
const { isMobile } = useDeviceDetect();
```

**After:**
```typescript
const { platform } = usePlatform();
const isInMiniApp = platform === "farcaster";
const isMobile = platform === "mobile";
```

#### Features & Actions
**Before:**
```typescript
const { canShare, shareWorkout, addMiniApp } = useMiniApp();
```

**After:**
```typescript
const { canShare, share, addToHome } = usePlatformFeatures();
```

### 4. Update Chain Switching

**Before:**
```typescript
const { switchToOptimalChain } = useUniversalWallet();
await switchToOptimalChain(42220);
```

**After:**
```typescript
const { switchChain } = useWallet();
await switchChain(42220);
```

### 5. Update User Data Access

**Before:**
```typescript
const { user: farcasterUser } = useFarcasterContext();
const { user: miniAppUser } = useMiniApp();
```

**After:**
```typescript
const { user } = usePlatform();
// user contains unified user data from any platform
```

## API Reference

### usePlatform()
Returns the complete platform context:
```typescript
interface PlatformContextType {
  platform: "farcaster" | "mobile" | "desktop" | "pwa";
  isReady: boolean;
  user: PlatformUser | null;
  wallet: WalletState;
  features: PlatformFeatures;
  actions: PlatformActions;
  error: string | null;
}
```

### useWallet()
Convenience hook for wallet operations:
```typescript
interface WalletHook {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: "farcaster" | "wagmi" | null;
  isConnecting: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<boolean>;
}
```

### usePlatformFeatures()
Convenience hook for platform-specific features:
```typescript
interface PlatformFeaturesHook {
  canNotify: boolean;
  canShare: boolean;
  canAddToHome: boolean;
  canSwitchChains: boolean;
  preferredChains: number[];
  defaultChain: number;
  share: (content: ShareContent) => Promise<boolean>;
  addToHome: () => Promise<boolean>;
  sendNotification: (title: string, body: string) => Promise<boolean>;
}
```

## Platform-Specific Configurations

The new system automatically configures itself based on the detected platform:

### Farcaster
- Default chain: CELO (42220)
- Supported chains: CELO, Polygon, Monad
- Features: notifications, sharing, add to home, chain switching
- Wallet strategy: Farcaster wallet first, then fallback

### Mobile
- Default chain: CELO (42220)
- Supported chains: CELO, Base
- Features: sharing, add to home (PWA)
- Wallet strategy: Coinbase Wallet preferred

### Desktop
- Default chain: Base (84532)
- Supported chains: All supported chains
- Features: advanced settings, multi-chain
- Wallet strategy: Coinbase Wallet preferred

### PWA
- Default chain: CELO (42220)
- Supported chains: CELO, Base
- Features: notifications, sharing, chain switching
- Wallet strategy: Coinbase Wallet preferred

## Benefits

1. **Performance**: Single context reduces re-renders
2. **Maintainability**: One source of truth for platform state
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Flexibility**: Easy to add new platforms or features
5. **DRY**: No more duplicate logic across contexts
6. **Testing**: Easier to mock and test single context

## Backward Compatibility

The new system provides backward compatibility exports:
```typescript
// These still work but are deprecated
export { usePlatform as useUniversalWallet } from "@/contexts/PlatformContext";
export { useWallet as useWalletProvider } from "@/contexts/PlatformContext";
export function useNetwork() { /* legacy implementation */ }
```

## Next Steps

1. Update your app to use `SimplifiedAppProviders`
2. Migrate components one by one using this guide
3. Test thoroughly on all platforms
4. Remove old context files once migration is complete
5. Update any custom hooks that depend on the old contexts
