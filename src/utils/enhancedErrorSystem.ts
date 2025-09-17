/**
 * Enhanced Error Logging and User Feedback System
 *
 * Provides comprehensive error tracking, user-friendly feedback, and debugging
 * capabilities for Web3 connection and transaction issues.
 */

import { createRemoteLogger } from './remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('EnhancedErrorSystem');

interface ErrorContext {
  timestamp: string;
  userAgent: string;
  url: string;
  walletType?: string;
  networkId?: number;
  contractAddress?: string;
  functionName?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
  blockNumber?: number;
}

interface ErrorReport {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  diagnostics: any;
  userFriendlyMessage: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
}

interface UserFeedbackOptions {
  showToast?: boolean;
  toastDuration?: number;
  includeRetryButton?: boolean;
  includeDebugInfo?: boolean;
  onRetry?: () => void;
  onReportBug?: (report: ErrorReport) => void;
}

// Error categorization for better handling
const ERROR_CATEGORIES = {
  WALLET_CONNECTION: {
    patterns: [
      'could not establish connection',
      'receiving end does not exist',
      'ethereum provider',
      'wallet',
      'extension',
      'injected',
    ],
    severity: 'high' as const,
    isRetryable: true,
  },
  PROVIDER_CONFLICT: {
    patterns: [
      'override',
      'window.ethereum',
      'provider conflict',
      'multiple wallets',
      'cannot set property',
    ],
    severity: 'high' as const,
    isRetryable: false,
  },
  NETWORK_ERROR: {
    patterns: [
      'network',
      'rpc',
      'jsonrpcprovider',
      'failed to detect network',
      'connection refused',
      'timeout',
    ],
    severity: 'medium' as const,
    isRetryable: true,
  },
  CONTRACT_ERROR: {
    patterns: [
      'contract',
      'revert',
      'execution reverted',
      'missing revert data',
      'function',
      'abi',
    ],
    severity: 'medium' as const,
    isRetryable: true,
  },
  TRANSACTION_ERROR: {
    patterns: ['transaction', 'gas', 'nonce', 'insufficient funds', 'user rejected', 'underpriced'],
    severity: 'low' as const,
    isRetryable: true,
  },
  WALLETCONNECT_ERROR: {
    patterns: ['walletconnect', 'session', 'indexeddb', 'wc@2', 'reown', 'web3modal'],
    severity: 'medium' as const,
    isRetryable: true,
  },
};

// User-friendly error messages
const ERROR_MESSAGES = {
  WALLET_CONNECTION: {
    title: 'Wallet Connection Issue',
    message: 'There was a problem connecting to your wallet.',
    suggestions: [
      'Refresh the page and try again',
      'Make sure your wallet extension is installed and unlocked',
      'Try using a different browser or disabling other wallet extensions',
    ],
  },
  PROVIDER_CONFLICT: {
    title: 'Multiple Wallet Conflict',
    message: 'Multiple wallet extensions are interfering with each other.',
    suggestions: [
      'Disable other wallet extensions except the one you want to use',
      'Try using a different browser',
      'Clear your browser cache and cookies',
    ],
  },
  NETWORK_ERROR: {
    title: 'Network Connection Problem',
    message: 'Unable to connect to the blockchain network.',
    suggestions: [
      'Check your internet connection',
      'Try switching to a different network and back',
      'Wait a moment and try again',
    ],
  },
  CONTRACT_ERROR: {
    title: 'Smart Contract Error',
    message: 'The smart contract rejected your transaction.',
    suggestions: [
      'Check that you have sufficient balance',
      'Verify the contract address is correct',
      'Try again with a higher gas limit',
    ],
  },
  TRANSACTION_ERROR: {
    title: 'Transaction Failed',
    message: 'Your transaction could not be processed.',
    suggestions: [
      'Check your wallet balance',
      'Try increasing the gas fee',
      'Make sure you have enough ETH for gas',
    ],
  },
  WALLETCONNECT_ERROR: {
    title: 'WalletConnect Issue',
    message: 'There was a problem with the WalletConnect session.',
    suggestions: [
      'Disconnect and reconnect your wallet',
      'Clear browser data and try again',
      'Use the wallet app directly instead of WalletConnect',
    ],
  },
};

/**
 * Categorize an error based on its message and properties
 */
function categorizeError(error: any): keyof typeof ERROR_CATEGORIES | 'UNKNOWN' {
  const errorText = (error.message || error.toString()).toLowerCase();

  for (const [category, config] of Object.entries(ERROR_CATEGORIES)) {
    if (config.patterns.some((pattern) => errorText.includes(pattern))) {
      return category as keyof typeof ERROR_CATEGORIES;
    }
  }

  return 'UNKNOWN';
}

/**
 * Generate comprehensive diagnostics for an error
 */
async function generateDiagnostics(error: any, context?: Partial<ErrorContext>): Promise<any> {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    errorType: typeof error,
    errorConstructor: error?.constructor?.name,
    errorCode: error?.code,
    errorReason: error?.reason,
  };

  try {
    // Browser environment diagnostics
    diagnostics.browser = {
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      hasEthereum: typeof window !== 'undefined' && !!(window as any).ethereum,
      isFrame: typeof window !== 'undefined' && window.parent !== window,
      cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  } catch (err) {
    diagnostics.browser = { error: 'Failed to get browser diagnostics' };
  }

  return diagnostics;
}

/**
 * Create a comprehensive error report
 */
export async function createErrorReport(
  error: any,
  context?: Partial<ErrorContext>
): Promise<ErrorReport> {
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const category = categorizeError(error);
  const categoryConfig = (category !== 'UNKNOWN' && ERROR_CATEGORIES[category]) || {
    severity: 'medium' as const,
    isRetryable: false,
  };
  const messageConfig =
    (category !== 'UNKNOWN' && ERROR_MESSAGES[category]) || ERROR_MESSAGES.TRANSACTION_ERROR;

  const fullContext: ErrorContext = {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    ...context,
  };

  const diagnostics = await generateDiagnostics(error, fullContext);

  const report: ErrorReport = {
    id: errorId,
    type: category,
    message: error?.message || error?.toString() || 'Unknown error',
    stack: error?.stack,
    context: fullContext,
    diagnostics,
    userFriendlyMessage: messageConfig.message,
    suggestions: messageConfig.suggestions,
    severity: categoryConfig.severity,
    isRetryable: categoryConfig.isRetryable,
  };

  // Log the error report
  logger.error('Error report generated:', {
    id: errorId,
    type: category,
    severity: categoryConfig.severity,
    isRetryable: categoryConfig.isRetryable,
    message: error?.message,
  });

  return report;
}

/**
 * Display user-friendly error feedback
 */
export function showUserFeedback(report: ErrorReport, options: UserFeedbackOptions = {}): void {
  const {
    showToast = true,
    toastDuration = 6000,
    includeRetryButton = report.isRetryable,
    includeDebugInfo = false,
    onRetry,
    onReportBug,
  } = options;

  if (!showToast) return;

  const messageConfig =
    ERROR_MESSAGES[report.type as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.TRANSACTION_ERROR;

  // Determine toast style based on severity
  const toastOptions: any = {
    duration: toastDuration,
    id: report.id,
  };

  let toastFunction = toast.error;
  if (report.severity === 'low') {
    toastFunction = toast;
  } else if (report.severity === 'medium') {
    toastFunction = toast.error;
  } else {
    toastFunction = toast.error;
    toastOptions.duration = 8000; // Longer for critical errors
  }

  // Create message with suggestions
  let message = `${messageConfig.title}: ${report.userFriendlyMessage}`;

  if (report.suggestions.length > 0) {
    const suggestions = report.suggestions.join('\\n• ');
    message += `\\n\\nSuggestions:\\n• ${suggestions}`;
  }

  if (includeDebugInfo) {
    message += `\\n\\nError ID: ${report.id}`;
  }

  toastFunction(message, toastOptions);
}

/**
 * Enhanced error handler that combines reporting and user feedback
 */
export async function handleErrorComprehensively(
  error: any,
  context?: Partial<ErrorContext>,
  options?: UserFeedbackOptions
): Promise<ErrorReport> {
  try {
    const report = await createErrorReport(error, context);
    showUserFeedback(report, options);
    return report;
  } catch (reportingError) {
    logger.error('Failed to create error report:', reportingError);

    // Fallback to basic error handling
    const fallbackMessage = error?.message || 'An unexpected error occurred';
    toast.error(fallbackMessage, { duration: 5000 });

    // Return minimal report
    return {
      id: `fallback_${Date.now()}`,
      type: 'UNKNOWN',
      message: fallbackMessage,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      },
      diagnostics: { error: 'Failed to generate diagnostics' },
      userFriendlyMessage: fallbackMessage,
      suggestions: ['Please try again'],
      severity: 'medium',
      isRetryable: true,
    };
  }
}
