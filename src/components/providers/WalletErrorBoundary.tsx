'use client';

import React, { Component, ReactNode } from 'react';
import { Spinner } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error boundary specifically for wallet provider issues
 * Catches and handles wallet-related errors gracefully
 */
export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log wallet-specific errors
    console.error('Wallet Provider Error:', error);
    console.error('Error Info:', errorInfo);

    // Check if it's a window.ethereum override error
    if (error.message.includes('Cannot set property ethereum')) {
      console.warn(
        '🚨 Detected window.ethereum override error - this is usually caused by wallet provider conflicts'
      );
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    // Clear error state and try again
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });

    // Reload the page as a last resort for wallet provider issues
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="text-red-500 text-6xl">⚠️</div>
            <h1 className="text-yellow-400 text-xl font-bold">Wallet Connection Error</h1>
            <div className="text-gray-300 text-sm space-y-2">
              <p>There was an issue connecting to your wallet.</p>
              <p>This is usually caused by:</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Multiple wallet extensions conflicting</li>
                <li>Browser security restrictions</li>
                <li>Outdated wallet extension</li>
              </ul>
            </div>

            {this.state.error?.message.includes('Cannot set property ethereum') && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3 text-sm text-red-300">
                <strong>Detected:</strong> Wallet provider conflict. Try disabling other wallet
                extensions or using a different browser.
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="bg-yellow-400 text-black px-6 py-2 rounded font-bold hover:bg-yellow-300 transition-colors"
              >
                Retry Connection
              </button>

              <div className="text-xs text-gray-400">
                <p>If the problem persists:</p>
                <p>1. Refresh the page</p>
                <p>2. Try a different browser</p>
                <p>3. Disable other wallet extensions</p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-xs text-gray-500 mt-4">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WalletErrorBoundary;
