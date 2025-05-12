// walletReset.ts
// Utility functions for resetting wallet state

/**
 * Completely resets all wallet-related state in the application
 * Used when switching wallet types or disconnecting
 */
export const resetAllWalletState = () => {
  // Clear local storage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selectedWalletProvider');
    localStorage.removeItem('selectedNetwork');
    localStorage.removeItem('selectedChain');
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('wagmi.wallet');
    localStorage.removeItem('wagmi.connected');
    localStorage.removeItem('wagmi.store');
    
    // Log the reset for debugging
    console.log('All wallet state has been reset');
  }
};

/**
 * Checks if a wallet provider has properly disconnected
 * @param address The current address, if any
 * @returns Boolean indicating if the wallet is properly disconnected
 */
export const isWalletProperlyDisconnected = (address: string | undefined): boolean => {
  return !address;
};

/**
 * Safely disconnects from all wallet providers
 * @param disconnectFunctions Array of disconnect functions to call
 */
export const safeDisconnectFromAllProviders = async (
  disconnectFunctions: (() => void | Promise<void>)[]
) => {
  try {
    // Call all disconnect functions
    await Promise.all(
      disconnectFunctions.map(async (disconnect) => {
        if (typeof disconnect === 'function') {
          try {
            await disconnect();
          } catch (error) {
            console.error('Error disconnecting from provider:', error);
          }
        }
      })
    );
    
    // Additional cleanup
    resetAllWalletState();
    
    return true;
  } catch (error) {
    console.error('Error during wallet disconnection:', error);
    return false;
  }
};