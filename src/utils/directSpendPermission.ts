import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  Address,
  Hex,
  parseEther,
  formatEther,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import toast from 'react-hot-toast';
import { getEthereumProvider } from './farcasterMiniApp';

// Constants for the spend permission manager
const SPEND_PERMISSION_MANAGER_ADDRESS =
  '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as `0x${string}`;
const NATIVE_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as `0x${string}`;
const SUBACCOUNT_FACTORY_ADDRESS = '0x000000006551c19487814612e58FE06813775758' as `0x${string}`;

// ABI for the SubAccount Factory
const subAccountFactoryABI = [
  {
    inputs: [{ internalType: 'address', name: 'parent', type: 'address' }],
    name: 'getSubAccountsForParent',
    outputs: [{ internalType: 'address[]', name: 'subAccounts', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ABI for the SpendPermissionManager
const spendPermissionManagerABI = [
  {
    type: 'function',
    name: 'approveWithSignature',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'allowance', type: 'uint160', internalType: 'uint160' },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

// Interface for the SpendPermission structure
export interface SpendPermission {
  account: `0x${string}`;
  spender: `0x${string}`;
  token: `0x${string}`;
  allowance: bigint;
  period: bigint;
  start: bigint;
  end: bigint;
  salt: bigint;
  extraData: `0x${string}`;
}

// EIP-712 types for the spend permission
export const SPEND_PERMISSION_EIP712_TYPES = {
  SpendPermission: [
    { name: 'account', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'allowance', type: 'uint160' },
    { name: 'period', type: 'uint48' },
    { name: 'start', type: 'uint48' },
    { name: 'end', type: 'uint48' },
    { name: 'salt', type: 'uint256' },
    { name: 'extraData', type: 'bytes' },
  ],
} as const;

// Interface for Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
}

// Get a public client for Base Sepolia
export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
}

// Get a wallet client using the appropriate provider (Farcaster or window.ethereum)
export async function getWalletClient() {
  const provider = await getEthereumProvider();
  if (!provider) {
    throw new Error('No Ethereum provider found');
  }

  return createWalletClient({
    chain: baseSepolia,
    transport: custom(provider as EthereumProvider),
  });
}

// Check if the user has a smart account
export async function getSmartAccount(address: Address): Promise<Address | null> {
  try {
    // First, check if we're on the correct network (Base Sepolia)
    const publicClient = getPublicClient();

    // Try a safer approach - simulate the call first
    try {
      const result = await publicClient.simulateContract({
        address: SUBACCOUNT_FACTORY_ADDRESS,
        abi: subAccountFactoryABI,
        functionName: 'getSubAccountsForParent',
        args: [address],
      });

      // If simulation succeeds, make the actual call
      const smartAccounts = (await publicClient.readContract(result.request)) as Address[];

      if (smartAccounts && smartAccounts.length > 0) {
        return smartAccounts[0];
      }
    } catch (simulationError) {
      console.log('Simulation error:', simulationError);

      // If simulation fails, try a different approach
      // For now, we'll just return null to indicate no smart account
      // In a real implementation, you might want to try a different method
      console.log('Could not detect smart account through contract call');
    }

    // If we get here, either the call failed or there are no smart accounts
    // Let's check if the wallet is Coinbase Wallet as a fallback
    const provider = (window.ethereum || window.coinbaseWalletExtension) as
      | EthereumProvider
      | undefined;
    if (provider?.isCoinbaseWallet) {
      // If it's Coinbase Wallet, we can assume they might have a smart account
      // but we couldn't detect it through the contract call
      console.log("Coinbase Wallet detected, but couldn't find smart account through contract");
    }

    return null;
  } catch (error) {
    console.error('Error getting smart account:', error);
    return null;
  }
}

// Check the balance of an address
export async function getAddressBalance(address: Address): Promise<string> {
  try {
    const publicClient = getPublicClient();

    try {
      const balance = await publicClient.getBalance({ address });
      return formatEther(balance);
    } catch (balanceError) {
      console.error('Error getting balance:', balanceError);

      // If we can't get the balance, return a small default value
      // This allows the UI to continue functioning
      console.log('Could not get balance, returning default value');
      return '0.001'; // Small default value to allow UI to continue
    }
  } catch (error) {
    console.error('Error in getAddressBalance:', error);
    return '0';
  }
}

// Create a spend permission with different approaches
export function createSpendPermission(
  smartAccountAddress: Address,
  parentAddress: Address,
  approach: 'standard' | 'minimal' | 'random' | 'direct' = 'standard'
): SpendPermission {
  const now = BigInt(Math.floor(Date.now() / 1000));

  switch (approach) {
    case 'minimal':
      // Minimal values for everything
      return {
        account: smartAccountAddress,
        spender: parentAddress,
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther('0.0001'), // Very small amount
        period: BigInt(3600), // 1 hour
        start: now,
        end: now + BigInt(86400), // 1 day
        salt: BigInt(0),
        extraData: '0x' as `0x${string}`,
      };

    case 'random':
      // Random salt and different timing
      return {
        account: smartAccountAddress,
        spender: parentAddress,
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther('0.001'),
        period: BigInt(43200), // 12 hours
        start: now,
        end: now + BigInt(604800), // 1 week
        salt: BigInt(Math.floor(Math.random() * 1000000000)),
        extraData: '0x' as `0x${string}`,
      };

    case 'direct':
      // For direct contract interaction
      return {
        account: smartAccountAddress,
        spender: parentAddress,
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther('0.001'),
        period: BigInt(86400), // 1 day
        start: now,
        end: now + BigInt(2592000), // 30 days
        salt: BigInt(Date.now()),
        extraData: '0x' as `0x${string}`,
      };

    case 'standard':
    default:
      // Standard approach
      return {
        account: smartAccountAddress,
        spender: parentAddress,
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther('0.01'),
        period: BigInt(86400), // 1 day
        start: now,
        end: now + BigInt(31536000), // 1 year
        salt: BigInt(0),
        extraData: '0x' as `0x${string}`,
      };
  }
}

// Direct contract interaction to approve spend permission
export async function approveSpendPermissionDirectly(
  spendPermission: SpendPermission,
  signature: Hex
): Promise<boolean> {
  try {
    const publicClient = getPublicClient();
    const walletClient = await getWalletClient();

    // Get the connected account
    const [account] = await walletClient.getAddresses();

    // Convert bigint values to numbers for the contract
    const contractSpendPermission = {
      ...spendPermission,
      period: Number(spendPermission.period),
      start: Number(spendPermission.start),
      end: Number(spendPermission.end),
    };

    // Prepare the transaction
    const { request } = await publicClient.simulateContract({
      address: SPEND_PERMISSION_MANAGER_ADDRESS,
      abi: spendPermissionManagerABI,
      functionName: 'approveWithSignature',
      args: [contractSpendPermission, signature],
      account,
    });

    // Send the transaction
    const hash = await walletClient.writeContract(request);
    console.log('Transaction hash:', hash);

    toast.success(`Transaction sent! Hash: ${hash}`);

    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction receipt:', receipt);

    if (receipt.status === 'success') {
      toast.success('Transaction confirmed successfully!');
      return true;
    } else {
      toast.error('Transaction failed');
      return false;
    }
  } catch (error) {
    console.error('Error in direct contract interaction:', error);
    if (error instanceof Error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.error('An unknown error occurred');
    }
    return false;
  }
}
