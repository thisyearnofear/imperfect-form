# Architecture Overview

## Self Protocol Integration

**Status**: ✅ Live on Celo Mainnet

### Features

- Real passport verification with zero-knowledge proofs
- Privacy-first human verification
- Verified leaderboards and user authentication

### Configuration

- Mainnet deployment ready
- Fallback mechanisms for verification failures
- Age verification (18+ requirement)

### Usage

```javascript
import { SelfVerificationModal } from '@/components/verification/SelfVerificationModal';
```

## Theming System

### Chain-Specific UI/UX

- **Base**: Blue theme with Coinbase branding
- **Celo**: Green theme with nature-inspired elements
- **Polygon**: Purple theme with geometric patterns
- **Monad**: Dark theme with performance focus

### Dynamic Theme Loading

- Automatic chain detection
- Performance-optimized theme switching
- Consistent component library across chains

### Implementation

```javascript
import { useChainTheme } from '@/hooks/useChainTheme';
```

## Cross-Chain UX

### Multi-Chain Support

- **Base Mainnet**: `0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B`
- **Celo Mainnet**: `0xB0cbC7325EbC744CcB14211CA74C5a764928F273`
- **Polygon Mainnet**: `0xc783d6E12560dc251F5067A62426A5f3b45b6888`
- **Monad Testnet**: `0x653d41Fba630381aA44d8598a4b35Ce257924d65`

### Network Switching

- Seamless chain transitions
- User-friendly network prompts
- Consistent experience across chains

## AI Pose Detection

### Technology Stack

- MediaPipe for real-time pose detection
- TensorFlow.js for browser-based ML
- Camera utilities for video processing

### Features

- Real-time fitness tracking
- Exercise form analysis
- Performance metrics collection

## Social Integration

### Farcaster Integration

- Frame-based sharing
- Community features
- Social workout challenges

### Features

- Workout sharing
- Leaderboard integration
- Community engagement tools
