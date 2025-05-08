# Sub-Account Implementation Guide

This document explains how sub-accounts are implemented in the Imperfect Form app using Coinbase Smart Wallet.

## Overview

The app allows users to create and use sub-accounts with Coinbase Smart Wallet to enable:

1. **One-click submissions** without requiring multiple signatures
2. **Spend limits** for recurring interactions
3. **Better user experience** with fewer wallet prompts

## Implementation Architecture

### Frontend Components

- `SetupSpendLimits.tsx`: UI for creating sub-accounts and setting up spend limits
- `SubmitScore.tsx`: Uses spend limits for transaction submissions when available

### Backend API

- `/api/create-subaccount`: Serverless API endpoint that creates sub-accounts for users

### Utilities

- `subAccountsManager.ts`: Utility functions for managing sub-accounts and spend limits

## How It Works

1. User connects their Coinbase Smart Wallet to the app
2. User clicks "Create Sub-Account" button
3. The app calls the API endpoint to create a sub-account
4. The API creates the sub-account using the app's private key
5. Sub-account is associated with the user's wallet
6. User sets up spend limits on this sub-account
7. Future transactions use these spend limits for seamless submissions

## Setup Requirements

Before using this feature, you need to:

1. Generate an app private key (see `SETUP_PRIVATE_KEY.md`)
2. Store it in `.env.local` for development
3. Add it to Vercel environment variables for production
4. Fund the wallet associated with this private key with some ETH

## Contracts Used

- **Sub-Account Factory**: `0x000000006551c19487814612e58FE06813775758` on Base Sepolia
- **Spend Permission Manager**: `0x00000000Ea70745D4f5CF8d80Ea7C9E19D11deD9` on Base Sepolia

## Security Considerations

- The app's private key is stored securely on the server
- All sub-account creation transactions are processed on the server
- Spend limits are signed by the user and have time-based restrictions
- Sub-accounts can only be created by the app's backend (verified by the contract)

## Troubleshooting

If you encounter issues:

- Check that the app's private key is properly set up
- Ensure the associated wallet has ETH for gas
- Check server logs for transaction errors
- Make sure the Coinbase Smart Wallet is properly connected

## References

- [Base Sub-Accounts Documentation](https://docs.base.org/identity/smart-wallet/guides/sub-accounts)
- [Spend Limits Documentation](https://docs.base.org/identity/smart-wallet/guides/spend-limits)
