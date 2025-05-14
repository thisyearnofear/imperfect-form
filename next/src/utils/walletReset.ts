// walletReset.ts
// Utility functions for resetting wallet state

/**
 * Completely resets all wallet-related state in the application
 * Used when switching wallet types or disconnecting
 */
export const resetAllWalletState = () => {
  // Clear local storage
  if (typeof window !== 'undefined') {
    // Clear wallet provider and network settings
    localStorage.removeItem('selectedWalletProvider');
    localStorage.removeItem('selectedNetwork');
    localStorage.removeItem('selectedChain');
    localStorage.removeItem('connectedWallet');
    
    // Clear Wagmi state
    localStorage.removeItem('wagmi.wallet');
    localStorage.removeItem('wagmi.connected');
    localStorage.removeItem('wagmi.store');
    localStorage.removeItem('wagmi.cachified');
    
    // Clear ThirdWeb state
    localStorage.removeItem('thirdweb.auth.token');
    localStorage.removeItem('thirdweb.wallets');
    localStorage.removeItem('thirdweb.wallet');
    localStorage.removeItem('thirdweb.wc.session');
    
    // Clear general connection state
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
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
    
    // Clear any ThirdWeb or Wagmi global objects if they exist
    if (typeof window !== 'undefined') {
      try {
        // Try to disconnect ThirdWeb
        if (window.thirdweb?.logout) {
          console.log('Calling ThirdWeb logout directly');
          window.thirdweb.logout();
        }
        
        // Try to access ethereum provider
        if (window.ethereum) {
          // Some providers offer a disconnect method, others don't
          try {
            // Send an eth_requestAccounts with empty parameters to "reset" the connection
            window.ethereum.request({ method: 'eth_accounts', params: [] });
          } catch (e) {
            console.warn('Could not reset ethereum provider:', e);
          }
        }
      } catch (e) {
        console.error('Error cleaning up global wallet objects:', e);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error during wallet disconnection:', error);
    return false;
  }
};