// Export the new simplified providers
export { default as SimplifiedAppProviders } from './SimplifiedAppProviders';
export { default } from './SimplifiedAppProviders';

// Backward compatibility exports
export { default as AppProviders } from './SimplifiedAppProviders';
export { default as Providers } from './SimplifiedAppProviders';

// Re-export the new hooks for components that want to migrate
export { usePlatform, useWallet, usePlatformFeatures } from '@/contexts/PlatformContext';
