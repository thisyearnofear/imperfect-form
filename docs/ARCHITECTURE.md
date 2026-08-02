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

Tailwind v4 configuration (compat mode via `@config`) maps all design tokens:

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

## Farcaster Mini Apps Integration (Phase 6)

**Status**: ✅ Complete - Wallet-first mini app with cross-chain score submission

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

### Cross-Platform Identity (Descoped)

The Memory Protocol integration was removed after upstream
`memoryproto.co` returned `402 DEPLOYMENT_DISABLED`. `useEnhancedProfile`
now returns a minimal profile shape locally so the UI keeps rendering
without any external identity graph. If we revisit cross-platform
identity, the replacement path is Farcaster/Neynar first, ENS/Basename
second — see `docs/ROADMAP.md` for the current "not doing" list.

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

## PoseRuntime (camera coaching pipeline)

**Status**: Session-scoped runtime — exercise is a strategy, not a remount.

This is the mass-market coaching spine (Ring 0) and the **primary actor** in
the Physical AI loop: the human trains here; the robot only _shows_ after form
understanding. Aesthetic registers and earned play chrome sit around it; they
must not tear it down mid-session. Product differentiation:
[NORTH_STAR.md](./NORTH_STAR.md) (“What we are”). Contract source:
`src/lib/pose/poseRuntime.ts`. Rules: [DEVELOPMENT.md](./DEVELOPMENT.md)
(Pose pipeline performance).

### Loop

```
CoachFoyer (studio) → Start → CameraPrimer (first time)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ PoseRuntime (owned for the session)                       │
│  LazyWebcam → Webcam → usePoseDetection                   │
│  path: worker (prod desktop) | main (mobile / dev default)│
│  mode hot-swap via modeRef + worker setMode               │
└───────────────────────────┬───────────────────────────────┘
                            │ keypoints / reps / metrics
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 ExerciseEngine      Coach bus (fail-silent)   SessionLogger
 (pushups|squats|    HUD · TTS · AgentTray     → Summary
  curls|pullups|     coachStation FormEvents
  jumps)
```

### Ownership rules (do not regress)

1. **Camera + model live for the session** — starting detection owns the
   pipeline until Stop. Switching curls → push-ups must not remount the camera.
2. **Mode is config** — `modeRef` + worker `setMode` / engine detector reset.
   Mode is **not** a dependency that restarts OffscreenCanvas transfer.
3. **Session end only on Stop** — `onSessionEnd` fires when `isActive`
   goes true → false. Never from Strict Mode effect cleanup.
4. **OffscreenCanvas transfer is irreversible** — poisoned hosts remount via
   `canvasEpoch` on `Webcam`. Dev defaults to main-thread to avoid Strict Mode
   races; production desktop uses the worker.
5. **Coach-station is a subscriber** — fail-silent when
   `NEXT_PUBLIC_COACH_STATION` is unset (`src/services/coachStation.ts`).

### Path selection

`shouldUsePoseWorker()` in `src/lib/pose/poseRuntime.ts`:

| Context                                   | Path                 |
| ----------------------------------------- | -------------------- |
| Mobile / no OffscreenCanvas               | main                 |
| Production desktop                        | worker               |
| Development (default)                     | main                 |
| `window.__IMF_FORCE_POSE_WORKER__ = true` | worker (smoke tests) |

Runtime status is published for debug/e2e as `window.__IMF_POSE_RUNTIME__`
(`{ path, mode, startedAt }`).

### Key files

| Layer       | Path                                                    |
| ----------- | ------------------------------------------------------- |
| Path policy | `src/lib/pose/poseRuntime.ts`                           |
| Pipeline    | `src/modules/usePoseDetection.ts`                       |
| Worker      | `src/modules/poseWorker.ts`                             |
| Canvas host | `src/components/game/Webcam.tsx`                        |
| Cold load   | `src/components/game/LazyWebcam.tsx`                    |
| Engine      | `src/lib/exercise-engine/`, `src/utils/biomechanics.ts` |
| Day-0 door  | `src/components/game/CoachFoyer.tsx`                    |
| Bridge      | `src/services/coachStation.ts`                          |

### Smoke tests

- Unit: `src/lib/pose/poseRuntime.test.ts` — path policy
- E2E: `e2e/pose-runtime.spec.ts` — curls + forced worker path, no canvas
  poison, session stays alive
- Ring 0: `e2e/ring0.spec.ts` — wallet-free foyer → primer → start
- Coach station fail-silent: `e2e/coach-station.spec.ts`

### Progress phases (UX)

1. **~10%** — Starting / camera
2. **~40–60%** — AI model init
3. **100%** — Ready (pose tracking)

Legacy note: `PoseDetectionService` still exists under `src/services/` for
older call sites; the live Ring 0 path is PoseRuntime above — do not add new
features to the service singleton without routing them through this contract.

## Coach Station (Physical AI bridge)

**Status**: Milestone 1 sim path shipped (console + Cyberwave `affect("simulation")`);
versioned lifecycle/progress feedback shipped, manual stage still required

The station is a **subscriber**, not the product center. Browser FormEvents
stream to a local Python service that resolves form issues into joint-space
demonstrations on the SO-101 twin — so the arm can _teach_ after the camera
has _understood_. Ring 0 coaching must work with the station offline.

```
exercise engine formCheckSpeak / coaching analyzeForm
        │
        ▼
coachStation.ts  ──ws://localhost:8765──►  coach_station/server.py
        │                                          │
        │◄──── demonstration (narration) ──  resolve_demonstration
        │                                          │
 bay pulse / twin peek                      trajectory (clamped)
                                                    │
                                         ConsoleArm | CyberwaveArm
                                         (joints.set degrees=True)
```

**Architecture intent:**

1. Scripted primitives prove understand → show before any learned policy.
2. Persona motion profiles keep demonstration in character with on-screen coach.
3. Safety clamps live on the station; the browser never drives joints directly.
4. UI presence (twin peek, bay pulse, and accessible progress) makes the twin
   felt in imperfectform.fun without embedding MuJoCo in the browser.
5. `command_id` correlates lifecycle and progress feedback; the browser ignores
   stale or invalid versions and remains fail-silent.

Key files: `coach-station/coach_station/{schema,primitives,trajectory,arm,demo,server,recordings}.py`,
`src/services/coachStation.ts`, `src/components/theme/CoachTwinPeek.tsx` — the
twin peek renders as an elbow instrument (dial, ghost target, motion trail,
SIM/LIVE badge, persona tint) sourced from the events above.

Wire events:

- `demonstration` — narration and command start cue
- `robot_state` — executing / idle / error lifecycle
- `trajectory_progress` — `elbow_flex`, current degrees, normalized progress;
  emitted at most 10Hz. `measured_deg` (additive, v1) carries the _observed_
  joint angle from `twin.joints.get_all()` when the backend can read it
  (sim telemetry cache or live encoders). `current_deg` remains the commanded
  waypoint; the UI dial prefers observed when present (`·obs` marker on the
  readout) and falls back to commanded otherwise.
- Twin alert publishing (`publish_fault`) posts aborted/rejected outcomes to
  `twin.alerts` when `COACH_TWIN_ALERTS=1`; kept off by default so sim
  iteration doesn't spam the Cyberwave dashboard alert feed.
- `command_result` — succeeded / aborted / rejected result

The browser only visualizes station feedback; safety limits and joint commands
remain station-side. `COACH_SIM_SPEED_SCALE` may accelerate local console
playback for development, but the reported trajectory duration remains the
physical/simulation timing contract used for synchronization.
See [NORTH_STAR.md](./NORTH_STAR.md) and
[coach-station/README.md](../coach-station/README.md).

## Social Integration

### Farcaster Integration

- Frame-based sharing
- Community features
- Social workout challenges

### Features

- Workout sharing
- Leaderboard integration
- Community engagement tools
