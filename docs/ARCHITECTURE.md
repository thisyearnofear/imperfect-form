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

## Design Token System (Phase 4)

### Unified Design Tokens

Single source of truth for all design decisions:

- **Colors**: Primary (#fcb131), Success (#10b981), Error, Warning, Neutral palettes + Network-specific colors
- **Spacing**: 4px-based scale (xs/sm/md/lg/xl) + semantic sizes
- **Typography**: Font families, sizes (xs-4xl), weights (light-bold), line heights
- **Shadows**: Layered system (sm/md/lg/xl) + branded glow effects
- **Transitions**: Durations (fast/base/normal/slow) + timing functions
- **Z-Index**: Hierarchical layering (base=0 to debug=9999)
- **Sizes**: Button, Input, Modal, Card, ProgressBar component-specific sizes
- **Breakpoints**: Mobile-first responsive design (xs/sm/md/lg/xl/2xl)

### Token Integration

All tokens centralized in `src/lib/designTokens.ts` with utilities:

- `useDesignTokens()` hook for type-safe access
- `getComponentStyle()` for pre-composed component styles
- `getResponsiveValue()` for adaptive breakpoint values
- `tokenAudit.ts` for codebase compliance scanning

### Tailwind Mapping

Complete Tailwind v3 configuration maps all design tokens:

- Colors: `bg-primary`, `text-success`, `border-error`, network colors
- Spacing: Direct scale mapping (p-2, m-4, gap-6, etc.)
- Typography: Font sizes, weights, line heights
- Components: `h-button-lg`, `w-modal-base`, `max-w-modal-xl`
- Z-index: `z-modal`, `z-tooltip`, `z-notification`

### Implementation

```javascript
import { designTokens } from '@/lib/designTokens';
import { useDesignTokens } from '@/hooks/useDesignTokens';

// Inline usage
style={{ color: designTokens.colors.primary }}

// Hook usage
const tokens = useDesignTokens();
style={{ padding: tokens.spacing.md }}

// Enhanced components (AccessibleDialog, etc.) use tokens automatically
```

## Data Synchronization System (Phase 5)

**Status**: ✅ Complete - Unified leaderboard data integration with real-time sync

### Unified Real-time Data Management

Centralized data layer with automatic caching, optimistic updates, and offline support:

**DataSyncService** (`src/services/DataSyncService.ts`):

- Cache management with TTL-based expiration
- Optimistic updates with automatic rollback on errors
- Real-time subscriptions with polling fallback
- Deduplication of in-flight requests
- Pattern-based cache invalidation (e.g., `user:*`)

**OfflineDataStore** (`src/services/OfflineDataStore.ts`):

- IndexedDB-backed persistent storage
- Sync queue for offline mutations
- Automatic transaction management
- Storage quota monitoring

**React Integration** (`src/hooks/useDataSync.ts`):

- `useQuery` - Read-only data fetching
- `useMutation` - Data mutation with optimistic updates
- `useDataSync` - Full sync control (fetch, mutate, subscribe)
- State machine-based loading/error handling
- Automatic cleanup and subscription management

### Data Flow

```
User Action → Component Hook → DataSyncService → Cache/API/OfflineStore
     ↓                                              ↓
  Loading/Error/Success State ←── Subscriptions ←─┘
```

### Key Capabilities

1. **Automatic Caching**
   - TTL-based cache expiration (default 5 minutes)
   - Fresh/stale state tracking
   - Pattern-based invalidation

2. **Optimistic Updates**
   - Instant UI feedback
   - Automatic rollback on mutation failure
   - Transaction-like semantics

3. **Real-time Sync**
   - Native subscriptions when available
   - Polling fallback (configurable interval)
   - Automatic retry with exponential backoff

4. **Offline-first**
   - IndexedDB persistence
   - Sync queue for mutations
   - Automatic reconnection handling

5. **Performance**
   - Request deduplication
   - Cancellable in-flight requests
   - Minimal re-renders via state machine

### Leaderboard Integration (Real Implementation)

Leaderboard data is integrated via **LeaderboardDataAdapter** - bridges existing fetching patterns to DataSyncService:

```typescript
// 1. Initialize once at app startup (e.g., layout/root)
import { initializeDataSync } from '@/services/initializeDataSync';

useEffect(() => {
  initializeDataSync();
}, []);

// 2. Use the synced hooks in components (drop-in replacement)
import { useSyncedFullLeaderboard, useSyncedScores } from '@/hooks';

const { data: leaderboardData, loading, error, refetch } = useSyncedFullLeaderboard();

// Pushups or squats only
const { data: pushupScores, loading } = useSyncedScores('pushups');

// 3. Invalidate after mutations
import { invalidateAllLeaderboards } from '@/services/integrations/LeaderboardDataAdapter';

async function submitScore(pushups, squats) {
  await API.submitScore(pushups, squats);
  invalidateAllLeaderboards(); // Trigger refetch
}
```

**Key Benefits:**

- Reuses existing `getLeaderboard()` and `getLegacyScores()` logic
- No duplicate fetching code
- Automatic deduplication across components
- Offline persistence via IndexedDB
- Single cache invalidation point

## Farcaster Mini Apps & Memory Protocol Integration (Phase 6)

**Status**: ✅ Complete - Wallet-first strategy implementation with cross-platform identity

### Mini App Foundation

Farcaster Mini App is live and fully integrated:

- **Manifest** (`/.well-known/farcaster.json`) - JFS-signed, domain-verified
- **SDK Integration** - User context, wallet provider (EIP-1193), actions (composeCast, notifications)
- **Embed Discovery** - OpenGraph-style meta tags for feed discovery
- **Wallet-First Flow** - Users open mini app → auto-connect Farcaster wallet → submit score → claim rewards

### Wallet Integration (Farcaster-First)

**Current Implementation**:

- Farcaster provider detection via `getEthereumProvider()`
- Multi-chain support (Base, Celo, Polygon, Monad)
- Score submission with fallback to window.ethereum
- Chain switching via Farcaster wallet
- Batch transactions (EIP-5792) for atomic operations
- Browser compatibility (Brave, mobile, privacy browsers)

**Provider Priority** (in SubmitScore.tsx):

1. Farcaster wallet provider (mini app context)
2. window.ethereum (browser extension)
3. Wagmi fallback (connected wallet)

### Memory Protocol Integration

**Live Features**:

- **Identity Graphs** - Resolve user identities across Web2/Web3 (Farcaster, Twitter, ENS, GitHub, Lens)
- **Cross-Platform Profiles** - Display unified social identities in leaderboard
- **Data Monetization** - Users upload fitness datasets, earn $MEM tokens
- **Social Challenges** - Create challenges with cross-platform followers
- **Earnings Tracking** - View data query rewards via Memory Protocol

**Implemented Components**:

- `MemoryAPIClient` - Identity graph queries, data upload, earnings lookup
- `useEnhancedProfile` - Cross-platform profile fetching with caching
- `FitnessDataUploader` - Structured/unstructured fitness data upload interface
- `SocialChallengeCreator` - Challenge creation with identity graph resolution
- `useMemoryRewards` - Earnings dashboard

### Social & Notifications

**Implemented**:

- Farcaster sharing via `sdk.actions.composeCast()`
- Mini app notifications via webhook events (miniapp_added, miniapp_removed)
- Notification signup & token management
- Social proof badges (verified status, follower counts)

**Architecture**:

- Webhook handler at `/api/miniapp/webhook`
- Notification signing via `/api/notifications/send`
- User status tracking in `/api/user/[fid]/miniapp-status`

### Alignment with Farcaster Wallet-First Pivot (Dec 2025)

Farcaster's strategic shift from social-first to wallet-first directly informed our design:

- **Primary Entry Point**: Wallet connection (not social discovery)
- **Flow**: Open mini app → use wallet → submit fitness → earn rewards → share to social
- **Engagement Loop**: Wallet utility (earn, swap, send) keeps users, social features deepen engagement
- **Cross-Chain**: Rewards accessible on Base, Celo, Polygon simultaneously

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
- Inherits from Design Token System for consistency

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
