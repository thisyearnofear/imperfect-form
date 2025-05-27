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
    localStorage.removeItem('userAddress');

    // Clear Wagmi state - be more comprehensive
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wagmi.')) {
        localStorage.removeItem(key);
      }
    });

    // Clear ThirdWeb state - be more comprehensive
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('thirdweb.') || key.startsWith('thirdweb-')) {
        localStorage.removeItem(key);
      }
    });

    // Clear WalletConnect state
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('walletconnect') || key.includes('WALLETCONNECT')) {
        localStorage.removeItem(key);
      }
    });

    // Clear Coinbase wallet state
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('coinbase') ||
          key.startsWith('walletlink') ||
          key.startsWith('cbw_') ||
          key.includes('coinbase')) {
        localStorage.removeItem(key);
      }
    });

    // Clear any other wallet-related state
    Object.keys(localStorage).forEach(key => {
      if (key.includes('wallet') ||
          key.includes('connect') ||
          key.includes('auth') ||
          key.includes('signer')) {
        localStorage.removeItem(key);
      }
    });

    // Try to clear any global wallet objects
    try {
      // Clear ThirdWeb global state
      if (window.thirdweb?.logout) {
        window.thirdweb.logout();
      }

      // Clear any ethereum provider state
      if (window.ethereum) {
        // Some providers store state in the provider itself
        try {
          window.ethereum.request({ method: 'eth_accounts', params: [] });
        } catch (e) {
          console.warn('Could not reset ethereum provider:', e);
        }
      }
    } catch (e) {
      console.error('Error cleaning up global wallet objects:', e);
    }

    // Log the reset for debugging
    console.log('All wallet state has been completely reset');
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