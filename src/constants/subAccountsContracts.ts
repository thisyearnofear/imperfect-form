import { Address } from 'viem';

// Sub-account Factory ABI (simplified for this example)
export const SUBACCOUNT_FACTORY_ADDRESS = '0x000000006551c19487814612e58FE06813775758'; // Base Sepolia
export const subAccountFactoryABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'parent',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'metadata',
        type: 'bytes',
      },
    ],
    name: 'createSubAccount',
    outputs: [
      {
        internalType: 'address',
        name: 'subAccount',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'parent',
        type: 'address',
      },
    ],
    name: 'getSubAccountsForParent',
    outputs: [
      {
        internalType: 'address[]',
        name: 'subAccounts',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Base Sepolia contract addresses
export const SPEND_PERMISSION_MANAGER_ADDRESS =
  '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address;
export const NATIVE_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;

// ABI for SpendPermissionManager
export const spendPermissionManagerABI = [
  {
    type: 'function',
    name: 'approve',
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
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
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
