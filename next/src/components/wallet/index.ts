// Simplified wallet exports - only what we actually need for the universal system
export { default as UniversalConnectButton } from './UniversalConnectButton';

// Keep Farcaster integration for mini app support
export { FarcasterAwareWalletButton } from './FarcasterAwareWalletButton';
export { FarcasterWalletProvider } from './FarcasterWalletProvider';

// Legacy stubs to prevent import errors from old components
export {
  WalletButton,
  SignatureWalletButton,
  SmartWalletButton,
  WalletTypeSelector,
  NetworkSelector,
  FallbackConnectButton,
  ConnectWallet,
  ThirdwebWrapper,
  useWalletProvider,
  useNetwork,
} from './LegacyStubs';