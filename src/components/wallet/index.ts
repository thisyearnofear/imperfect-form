// Unified wallet system - single source of truth
export { default as UnifiedConnectButton } from './UnifiedConnectButton';
export { default as WalletConnectionTroubleshooter } from './WalletConnectionTroubleshooter';

// Legacy compatibility exports - all redirect to UnifiedConnectButton
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

// Re-export unified as all previous button names for backwards compatibility
export { default as UniversalConnectButton } from './UnifiedConnectButton';
export { default as FarcasterAwareWalletButton } from './UnifiedConnectButton';
export { default as WalletStatusPill } from './WalletStatusPill';
