# Self Protocol Integration Documentation

## Overview

This document describes the integration of Self Protocol verification into the Imperfect Form application. Users who complete Self Protocol verification receive a 10% bonus on their fitness scores when submitting to the Celo Mainnet Verified Leaderboard.

## Architecture

### Components

1. **VerifiedFitnessLeaderboard.sol** - The verified contract deployed to Celo Mainnet
2. **FitnessLeaderboardCeloStandardized.sol** - The standard contract deployed to Celo Mainnet
3. **VerificationHelper.sol** - Library for handling Self Protocol integration
4. **IVerifiedFitness.sol** - Interface for the Self Protocol verification contract
5. **Frontend Components** - React components for displaying verification status

### Contract Addresses

- **Celo Standard Contract**: `0xB0cbC7325EbC744CcB14211CA74C5a764928F273`
- **Celo Verified Contract**: `0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03`
- **Self Protocol Hub**: `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`

## Integration Points

### 1. Environment Variables

The following environment variables are required:

```env
NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT=0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03
NEXT_PUBLIC_SELF_HUB_ADDRESS=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
NEXT_PUBLIC_SELF_NETWORK=celo_mainnet
NEXT_PUBLIC_SELF_CHAIN_ID=42220
```

### 2. Network Configuration

The `networks.ts` file includes two Celo network configurations:

```typescript
celo: {
  chainId: 42220,
  name: "Celo Mainnet",
  contractAddress: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
  abi: fitnessLeaderboardABI,
  rpcUrl: "https://forno.celo.org",
  blockExplorer: "https://celoscan.io"
},
celoVerified: {
  chainId: 42220,
  name: "Celo Mainnet (Verified)",
  contractAddress: process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT || "0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03",
  abi: verifiedFitnessLeaderboardABI,
  rpcUrl: "https://forno.celo.org",
  blockExplorer: "https://celoscan.io"
}
```

### 3. User Experience

When users select Celo as their network, they are presented with a choice:

1. **Standard Celo Leaderboard**:
   - Quick and easy submission
   - No verification required
   - Standard scoring

2. **Verified Celo Leaderboard**:
   - 10% bonus points for verified humans
   - Requires Self Protocol verification
   - Special recognition with verification badges

### 4. Submission Handling

The `unifiedSubmission.ts` utility handles both submission types:

- **Standard Submission**: Uses `addScore(pushups, squats)` function
- **Verified Submission**: Uses `submitScore(score, exerciseType)` function for each exercise

### 5. Leaderboard Integration

The main leaderboard aggregates data from both Celo contracts, displaying them with appropriate visual differentiation:

- Standard Celo entries use blue styling
- Verified Celo entries use green styling with verification badges

## User Flow

### New Celo Selection Flow

1. User completes exercises (pushups and/or squats)
2. User selects "Celo" from the network dropdown
3. User is presented with a choice between:
   - Standard Celo Leaderboard (quick submission)
   - Verified Celo Leaderboard (bonus points for verified users)
4. User makes their choice and submits
5. Score appears on the appropriate leaderboard

### Verification Process

1. User completes Self Protocol verification on the Self Protocol website
2. User returns to Imperfect Form
3. When submitting to the verified leaderboard, they automatically receive bonus points
4. Their entries are marked with verification badges

## Verification Badge

Verified users are displayed with a beautiful gradient badge:

```jsx
<VerificationBadge isVerified={true} size="md" />
```

## Bonus Points

Verified users receive a 10% bonus on their submitted scores. This is calculated automatically by the contract:

```solidity
function calculateEnhancedScore(
    uint256 baseScore,
    bool isVerified,
    uint256 bonusPercentage
) internal pure returns (uint256 enhancedScore) {
    if (!isVerified || bonusPercentage == 0) {
        return baseScore;
    }

    // Calculate bonus: baseScore * bonusPercentage / 100
    uint256 bonus = (baseScore * bonusPercentage) / 100;
    return baseScore + bonus;
}
```

## Testing

A verification test page is available at `/verification-test` to check if a wallet address is verified.

## Future Enhancements

1. **Perks for Verified Users**:
   - Display both cumulative and best scores on the verified leaderboard
   - Special recognition in the main leaderboard
   - Exclusive challenges and rewards

2. **Advanced Verification Features**:
   - Verification timestamp display
   - Verification statistics
   - User verification history

3. **UI Improvements**:
   - Animated verification badges
   - Verification progress indicators
   - Enhanced leaderboard visualization for verified users
