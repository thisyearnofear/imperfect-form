import { ethers } from 'ethers';
import { walletService } from './WalletService';
import { walletDetectionService } from './WalletDetectionService';
import { getNetworkByContractAddress, getNetworkByChainId } from '@/config/networks';
import { addReferralTagToCalldata, registerDivviReferral } from '@/utils/divviIntegration';
import { NetworkConfig, ScoreSubmissionResult } from '@/types/contracts';
import toast from 'react-hot-toast';

/**
 * Centralized contract service for better maintainability and testability
 */
export class ContractService {
  private static instance: ContractService;
  private currentNetwork: NetworkConfig | null = null;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Initialize the service - now delegates to WalletService
   */
  async initialize(connectedAddress?: string): Promise<void> {
    const result = await walletService.connect(connectedAddress);

    if (!result.success) {
      throw new Error(result.error || 'Failed to connect wallet');
    }

    // Set current network based on chain ID
    if (result.chainId) {
      this.currentNetwork = getNetworkByChainId(result.chainId);
    }

    console.log('ContractService initialized:', {
      userAddress: result.address,
      chainId: result.chainId,
      network: this.currentNetwork?.name,
    });
  }

  /**
   * Get network configuration for a contract address
   */
  private getNetworkConfig(contractAddress: string): NetworkConfig {
    const network = getNetworkByContractAddress(contractAddress);
    if (!network) {
      throw new Error(`Unsupported contract address: ${contractAddress}`);
    }
    return network;
  }

  /**
   * Create a contract instance
   */
  private createContract(contractAddress: string): ethers.Contract {
    const signer = walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected. Call initialize() first.');
    }

    const networkConfig = this.getNetworkConfig(contractAddress);
    return new ethers.Contract(contractAddress, networkConfig.abi, signer);
  }

  /**
   * Verify network compatibility
   */
  async verifyNetwork(expectedNetworkName: string, contractAddress: string): Promise<void> {
    const provider = walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet not connected');
    }

    const networkConfig = this.getNetworkConfig(contractAddress);
    const currentChainId = walletService.getChainId();

    if (currentChainId !== networkConfig.chainId) {
      throw new Error(
        `Wrong network. Expected ${networkConfig.name} (${networkConfig.chainId}), ` +
          `but connected to chain ${currentChainId}`
      );
    }

    console.log('Network verification passed:', {
      chainId: currentChainId,
      networkName: networkConfig.name,
      contractAddress,
    });
  }

  /**
   * Enhanced score submission with intelligent routing
   * CONSOLIDATION: Replaces all legacy submission logic
   */
  async submitScore(
    pushups: number,
    squats: number,
    contractAddress: string,
    networkName: string,
    connectedAddress?: string,
    skipSubAccountCheck = false
  ): Promise<ScoreSubmissionResult> {
    try {
      // Input validation
      if (pushups < 0 || squats < 0) {
        throw new Error('Score values must be non-negative');
      }

      const networkConfig = this.getNetworkConfig(contractAddress);
      const isBaseNetwork = networkConfig.chainId === 8453;

      // Handle Base network with Smart Wallet capabilities
      if (isBaseNetwork && !skipSubAccountCheck) {
        const capabilities = walletDetectionService.detectWalletCapabilities();

        if (capabilities.supportsSmartWallet) {
          console.log('Base Smart Wallet detected - using Wagmi flow');

          // For Base Smart Wallet, delegate to Wagmi for subaccount handling
          return {
            success: false,
            processingType: 'wagmi',
            useSpendLimit: true,
            error: 'Use Wagmi for Base transactions with automatic subaccounts',
          };
        }
      }

      // Standard direct submission flow
      return await this.executeDirectSubmission(
        pushups,
        squats,
        contractAddress,
        networkName,
        connectedAddress
      );
    } catch (error) {
      console.error('Score submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute direct contract submission
   * ENHANCEMENT: Consolidated from legacy directContractInteraction
   */
  private async executeDirectSubmission(
    pushups: number,
    squats: number,
    contractAddress: string,
    networkName: string,
    connectedAddress?: string
  ): Promise<ScoreSubmissionResult> {
    // Ensure wallet is connected
    if (!walletService.isConnected()) {
      await walletService.connect(connectedAddress);
    }

    const userAddress = walletService.getUserAddress();
    if (!userAddress) {
      throw new Error('Failed to get user address');
    }

    // Verify network compatibility
    await this.verifyNetwork(networkName, contractAddress);

    // Create contract and submit
    const contract = this.createContract(contractAddress);

    console.log('Executing direct submission:', {
      contractAddress,
      userAddress,
      pushups,
      squats,
      network: networkName,
    });

    // Show user feedback
    toast.loading('Preparing transaction...', { id: 'submit-score' });

    try {
      // Estimate gas with intelligent fallback
      const gasLimit = await this.estimateGasWithFallback(contract, pushups, squats);

      // Prepare transaction data with Divvi referral tag
      const iface = contract.interface;
      const originalData = iface.encodeFunctionData('submitScore', [pushups, squats]);
      const dataWithReferral = addReferralTagToCalldata(userAddress, originalData);

      // Send transaction with Divvi referral tag
      const signer = walletService.getSigner();
      if (!signer) {
        throw new Error('Signer not available');
      }

      const transaction = await signer.sendTransaction({
        to: contractAddress,
        data: dataWithReferral,
        gasLimit,
      });

      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'submit-score' });

      // Wait for confirmation
      const receipt = await transaction.wait();

      if (receipt?.status === 1) {
        // Register with Divvi after successful transaction
        await this.handleDivviIntegration(transaction.hash);

        toast.success('Score submitted successfully!', { id: 'submit-score' });

        return {
          success: true,
          transactionHash: transaction.hash,
          processingType: 'direct',
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (txError) {
      toast.error('Transaction failed', { id: 'submit-score' });
      throw txError;
    }
  }

  /**
   * Intelligent gas estimation with fallbacks
   * ENHANCEMENT: Robust gas estimation
   */
  private async estimateGasWithFallback(
    contract: ethers.Contract,
    pushups: number,
    squats: number
  ): Promise<bigint> {
    try {
      const gasEstimate = await contract.submitScore.estimateGas(pushups, squats);
      return (gasEstimate * 120n) / 100n; // Add 20% buffer
    } catch (gasError) {
      console.warn('Gas estimation failed, using network-specific fallback:', gasError);

      // Network-specific fallbacks based on historical data
      const chainId = walletService.getChainId();
      const fallbackGas: Record<number, bigint> = {
        137: 250000n, // Polygon
        8453: 300000n, // Base
        42220: 200000n, // Celo
        10143: 350000n, // Monad
      };

      return fallbackGas[chainId || 137] || 300000n;
    }
  }

  /**
   * Handle Divvi referral integration
   * CONSOLIDATION: Moved from legacy file
   */
  private async handleDivviIntegration(txHash: string): Promise<void> {
    try {
      const chainId = walletService.getChainId() || 137;
      await registerDivviReferral(txHash, chainId);
    } catch (divviError) {
      console.warn('Divvi integration failed:', divviError);
      // Don't block submission for Divvi failures
    }
  }

  /**
   * Get user's current score from contract
   */
  async getUserScore(contractAddress: string): Promise<{
    pushups: number;
    squats: number;
  } | null> {
    try {
      const userAddress = walletService.getUserAddress();
      if (!userAddress) {
        throw new Error('User address not available');
      }

      const contract = this.createContract(contractAddress);
      const score = await contract.getScore(userAddress);

      return {
        pushups: Number(score.pushups || 0),
        squats: Number(score.squats || 0),
      };
    } catch (error) {
      console.error('Failed to get user score:', error);
      return null;
    }
  }

  /**
   * Reset the service state
   */
  reset(): void {
    walletService.disconnect();
    this.currentNetwork = null;
  }

  /**
   * Get current user address
   */
  getUserAddress(): string | null {
    return walletService.getUserAddress();
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return walletService.isConnected();
  }
}

// Export singleton instance
export const contractService = ContractService.getInstance();
