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

- TensorFlow.js for browser-based ML
- Camera utilities for video processing
- Real-time pose inference with GPU acceleration

### Architecture

The pose detection system uses a centralized service layer (`PoseDetectionService`) that handles all initialization, progress tracking, and resource cleanup.

```
┌─────────────────────────────────┐
│      Game Component             │
│  • Tracks detectionProgress     │
│  • Renders PoseLoadingOverlay   │
└─────────────┬───────────────────┘
              │
      ┌───────▼──────────┐
      │   LazyWebcam     │
      │ (dynamic import) │
      └───────┬──────────┘
              │
      ┌───────▼──────────┐
      │   Webcam         │
      │ • Calls hook     │
      │ • Forwards CB    │
      └───────┬──────────┘
              │
      ┌───────▼────────────────────┐
      │  usePoseDetection Hook     │
      │ • Manages camera/canvas    │
      │ • Delegates to service     │
      └───────┬────────────────────┘
              │
      ┌───────▼──────────────────────────┐
      │ PoseDetectionService (Singleton) │
      │ • Initializes TensorFlow        │
      │ • Loads & warms up model        │
      │ • Emits progress events         │
      │ • Manages resource cleanup      │
      └────────────────────────────────┘
```

### Key Features

- **Unified Service Layer** - Centralized pose detection logic in `src/services/PoseDetectionService.ts`
- **Progress Tracking** - Real-time progress updates (10% → 30% → 70% → 100%) during initialization
- **State Management** - Observable pattern for reactive state changes
- **Model Warmup** - Automatic dummy inference after model load to eliminate first-detection latency
- **Resource Cleanup** - Proper disposal of TensorFlow.js resources

### API Usage

```typescript
import { getPoseDetectionService } from '@/services/PoseDetectionService';

const service = getPoseDetectionService();

// Subscribe to progress events
const unsubscribe = service.onProgress((progress) => {
  console.log(`${progress.percentage}% - ${progress.message}`);
});

// Subscribe to state changes
const unsubscribeState = service.onStateChange((state) => {
  console.log('Pose detected:', state.poseDetected);
});

// Initialize
await service.initializeTensorFlow(isMobile);
await service.initializeDetector(isMobile);

// Get detector instance
const detector = service.getDetector();

// Cleanup
service.dispose();
```

### Progress Phases

1. **10%** - Initializing TensorFlow.js
2. **30%** - Downloading pose detection model
3. **70%** - Warming up detector (first inference)
4. **100%** - Ready for detection

### Performance Improvements

| Metric                  | Before             | After                 |
| ----------------------- | ------------------ | --------------------- |
| Initialization feedback | None               | Real-time             |
| First detection latency | 1-2s spike         | Eliminated via warmup |
| Dead code               | ~250 lines         | 0 lines               |
| Service implementations | 2 (MediaPipe + TF) | 1 unified (TF)        |

### Features

- Real-time fitness tracking
- Exercise form analysis
- Performance metrics collection

### Recent Improvements (v1.0)

- ✅ Removed unused MediaPipe hook (`useMediaPipePose.ts`)
- ✅ Removed debug canvas borders from production code
- ✅ Created unified service layer with observable pattern
- ✅ Enhanced progress tracking with real percentages
- ✅ Added model warmup optimization
- ✅ Consolidated configuration in single location
- ✅ DRY principle: single source of truth for initialization logic

### Future Optimizations

1. **Web Worker** - Move TensorFlow initialization off main thread
2. **Model Caching** - Cache compiled models in IndexedDB
3. **ONNX Runtime** - Faster initialization alternative
4. **Lazy Warmup** - Defer model warmup until first detection needed

## Social Integration

### Farcaster Integration

- Frame-based sharing
- Community features
- Social workout challenges

### Features

- Workout sharing
- Leaderboard integration
- Community engagement tools
