// Sub-account Factory ABI (simplified for this example)
export const SUBACCOUNT_FACTORY_ADDRESS =
  "0x000000006551c19487814612e58FE06813775758"; // Base Sepolia
export const subAccountFactoryABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "parent",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "metadata",
        type: "bytes",
      },
    ],
    name: "createSubAccount",
    outputs: [
      {
        internalType: "address",
        name: "subAccount",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "parent",
        type: "address",
      },
    ],
    name: "getSubAccountsForParent",
    outputs: [
      {
        internalType: "address[]",
        name: "subAccounts",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Spend Permission Manager ABI (simplified for this example)
export const SPEND_PERMISSION_MANAGER_ADDRESS =
  "0x00000000Ea70745D4f5CF8d80Ea7C9E19D11deD9"; // Base Sepolia
export const spendPermissionManagerABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "address",
            name: "token",
            type: "address",
          },
          {
            internalType: "uint160",
            name: "allowance",
            type: "uint160",
          },
          {
            internalType: "uint48",
            name: "period",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "start",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "end",
            type: "uint48",
          },
          {
            internalType: "uint256",
            name: "salt",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "extraData",
            type: "bytes",
          },
        ],
        internalType: "struct SpendPermissionManager.SpendPermission",
        name: "spendPermission",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "approveWithSignature",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "address",
            name: "token",
            type: "address",
          },
          {
            internalType: "uint160",
            name: "allowance",
            type: "uint160",
          },
          {
            internalType: "uint48",
            name: "period",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "start",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "end",
            type: "uint48",
          },
          {
            internalType: "uint256",
            name: "salt",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "extraData",
            type: "bytes",
          },
        ],
        internalType: "struct SpendPermissionManager.SpendPermission",
        name: "spendPermission",
        type: "tuple",
      },
      {
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
    ],
    name: "spend",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Native ETH token address (used for spend permissions)
export const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
