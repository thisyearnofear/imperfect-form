# Base Builder Codes Integration Guide

## Overview

Your Builder Code (`bc_ozh43mmg`) has been integrated into Imperfect Form. All onchain transactions will now be attributed to you for rewards, analytics, and visibility on base.dev.

## What Was Integrated

### 1. Core Utilities (`src/utils/builderCodes.ts`)

- **encodeBuilderCodeSuffix()**: Encodes your Builder Code into ERC-8021 format
- **decodeBuilderCodeSuffix()**: Decodes attribution from transaction data
- **getBuilderCodeCapability()**: Returns capability object for `wallet_sendCalls`
- **Attribution tracking**: Stores attributed transactions in localStorage

### 2. Transaction Integration

#### Score Submissions (`src/utils/directSubmission.ts`)

All score submissions now include your Builder Code as a dataSuffix appended to the transaction calldata.

```typescript
// Example: Transaction now includes
data: 0x[functionCallData][builderCodeSuffix]
// Suffix format: 0x6261736561707000[CODE]8021802180218021
```

#### Batch Transactions (`src/utils/farcasterMiniApp.ts`)

`sendBatchTransactions()` automatically includes Builder Code capability when configured.

### 3. Configuration

#### Environment Variable (`.env.local.example`)

```bash
NEXT_PUBLIC_BUILDER_CODE=bc_ozh43mmg
```

**Action Required**: Add this to your `.env.local` file:

```bash
echo "NEXT_PUBLIC_BUILDER_CODE=bc_ozh43mmg" >> .env.local
```

### 4. Debug & Validation

#### Debug Component (`/debug-wallet`)

Visit `/debug-wallet` to see:

- Current Builder Code configuration
- ERC-8021 dataSuffix being used
- Attribution statistics
- Verification instructions

#### Validation Utilities (`src/utils/builderCodeValidator.ts`)

- `validateTransactionAttribution()`: Verify a transaction has proper attribution
- `isBuilderCodeConfigured()`: Check if Builder Code is set up
- `getAttributionStats()`: Get attribution statistics

## How It Works

### ERC-8021 DataSuffix Format

```
0x[7 bytes "baseapp"][1 byte null][8 bytes code][8 bytes ERC-8021 magic]
0x6261736561707000[CODE_HEX]8021802180218021
```

For `bc_ozh43mmg`:

```
0x62617365617070006f7a6834336d6d6700008021802180218021
```

### Gas Cost

- **16 gas per non-zero byte**
- 16 bytes suffix = ~256 gas per transaction (negligible)

## Verification

### 1. Check base.dev

1. Go to [base.dev](https://base.dev)
2. Navigate to **Onchain** → **Total Transactions**
3. Your attributed transactions will increment the counter

### 2. Check Block Explorer

1. Find your transaction on [Basescan](https://basescan.org)
2. View the **Input Data** field
3. Verify the last 16 bytes are: `8021802180218021`
4. Decode the suffix to confirm `bc_ozh43mmg`

### 3. Use Debug Tool

Visit `/debug-wallet` → Builder Code section to see real-time status

## Benefits

✅ **Rewards**: Automatic attribution when Base rewards program expands
✅ **Analytics**: Track user acquisition and conversion on base.dev
✅ **Visibility**: Appear in Base App Leaderboards and discovery surfaces

## Files Modified/Created

### Created

- `src/utils/builderCodes.ts` - Core encoding/decoding utilities
- `src/utils/builderCodeValidator.ts` - Validation utilities
- `src/components/debug/BuilderCodeDebug.tsx` - Debug UI component

### Modified

- `src/utils/directSubmission.ts` - Added dataSuffix to score submissions
- `src/utils/farcasterMiniApp.ts` - Added capability to batch transactions
- `.env.local.example` - Added Builder Code env var
- `src/components/debug/index.ts` - Exported BuilderCodeDebug
- `src/app/debug-wallet/page.tsx` - Added debug UI

## Testing

1. **Start the dev server**:

   ```bash
   pnpm dev
   ```

2. **Set your Builder Code**:

   ```bash
   echo "NEXT_PUBLIC_BUILDER_CODE=bc_ozh43mmg" >> .env.local
   ```

3. **Submit a score** on any network (Base, Polygon, Celo, Monad)

4. **Verify attribution**:
   - Check the transaction hash on a block explorer
   - Visit `/debug-wallet` to see attribution stats
   - Check base.dev for attributed transactions

## Troubleshooting

### Builder Code not appearing in transactions

1. Check `.env.local` has `NEXT_PUBLIC_BUILDER_CODE=bc_ozh43mmg`
2. Restart dev server after adding env var
3. Check browser console for "Adding Builder Code attribution" logs

### Validation fails

1. Ensure transaction data is long enough (function selector + args + suffix)
2. Verify the suffix is at the **end** of the input data
3. Check ERC-8021 magic bytes: `8021802180218021`

## Resources

- [Base Builder Codes Docs](https://base.dev/builder-codes)
- [ERC-8021 Specification](https://eips.ethereum.org/EIPS/eip-8021)
- [Base Dev Analytics](https://base.dev)

---

**Your Builder Code**: `bc_ozh43mmg`
**Integration Date**: 2026-02-18
**Status**: ✅ Complete & Built Successfully
