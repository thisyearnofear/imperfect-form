# Development Guide

## Prerequisites

- [pnpm](https://pnpm.io/) v8.15.1+
- [Node.js](https://nodejs.org/) v18+

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

## Build

```sh
pnpm build
```

## Testing

```sh
pnpm test
pnpm test:e2e
```

## Linting

```sh
pnpm lint
pnpm lint:fix
```

## Design System Integration

### Phase 4: Design Tokens System

**Status**: ✅ Complete - Core tokens and utilities implemented

**Key Files**:

- `src/lib/designTokens.ts` - Single source of truth (colors, spacing, typography, shadows, transitions, z-index, sizes, breakpoints)
- `src/hooks/useDesignTokens.ts` - Type-safe token access
- `tailwind.config.js` - Full Tailwind v3 mapping
- `src/lib/designTokens.ts` - Includes `validateTokenUsage()` for color migration guidance

**Implementation Pattern**:

```javascript
// Import tokens
import { designTokens } from '@/lib/designTokens';

// Inline styles with tokens
style={{ color: designTokens.colors.primary }}

// Via hook
const tokens = useDesignTokens();
style={{ padding: tokens.spacing.md }}

// Define local style maps (for variants/themes)
const NETWORK_STYLES = {
  base: { bg: 'bg-blue-900/50', text: 'text-blue-300' },
  celo: { bg: 'bg-green-900/50', text: 'text-green-300' },
};
```

**Migration Guide**:

1. Replace hardcoded colors with token references
2. Use `validateTokenUsage()` to check for unmigrated values
3. Prefer Tailwind classes where possible (e.g., `bg-primary`, `text-success`)
4. Use inline `designTokens` for dynamic/runtime values

**Completed Integrations**:

- AccessibleDialog - Full token migration for colors, spacing, shadows, z-index, transitions
- InitializationScreen - Primary color token
- SummaryModal - Network badge styles + status color constants

## Phase 5: API Integration & Real-time Data Sync

**Status**: ✅ Complete - Unified leaderboard data with DataSyncService

**Key Files**:

- `src/services/DataSyncService.ts` - Unified data management with caching, mutations, subscriptions
- `src/services/OfflineDataStore.ts` - IndexedDB-backed offline persistence with sync queue
- `src/hooks/useDataSync.ts` - React integration (useDataSync, useQuery, useMutation)
- `src/services/memoryApi.ts` - Enhanced Memory Protocol client (already existed)

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                   Component Layer                       │
│        useQuery / useMutation / useDataSync              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│            DataSyncService (Singleton)                  │
│  • Cache Management (5-min TTL by default)              │
│  • Optimistic Updates with Rollback                     │
│  • Real-time Subscriptions with Polling Fallback        │
│  • Duplicate Request Deduplication                      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼──────┐  ┌────▼────┐  ┌────▼─────┐
    │  API     │  │  Local  │  │ Offline  │
    │  Services│  │  Cache  │  │  Store   │
    │(Memory)  │  │         │  │ (IDBx)   │
    └──────────┘  └─────────┘  └──────────┘
```

**Core Patterns**:

```typescript
// Simple data fetching with automatic caching
const { data, loading, error, refetch } = useQuery(
  'leaderboard:pushups',
  () => fetchLeaderboardData('pushups'),
  { ttl: 5 * 60 * 1000 }
);

// Data mutation with optimistic updates
const { mutate, loading } = useMutation('user:score', async (score) => await submitScore(score), {
  optimistic: newScore,
  rollbackOnError: true,
});

// Full data sync with subscriptions
const { data, mutate, invalidate } = useDataSync(
  createDataKey('user:profile'),
  {
    fetch: () => API.getProfile(),
    mutate: (updates) => API.updateProfile(updates),
  },
  { pollInterval: 30000 }
);
```

**Key Features**:

- **Automatic Caching**: TTL-based cache with fresh/stale states
- **Optimistic Updates**: Instant UI updates, automatic rollback on error
- **Real-time Sync**: Native subscriptions with polling fallback
- **Offline-first**: IndexedDB persistence with sync queue
- **Deduplication**: Prevents duplicate in-flight requests
- **Error Handling**: Automatic retry with exponential backoff
- **Developer Experience**: Minimal boilerplate, type-safe

**Migration from Legacy Patterns**:

Old (manual caching):

```typescript
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

New (with DataSyncService):

```typescript
const { data } = useQuery('key', fetchData);
```

**Cache Invalidation**:

```typescript
// Invalidate single key
invalidate(createDataKey('leaderboard:pushups'));

// Invalidate pattern
service.invalidate('leaderboard:*');

// Automatic on mutation success
mutate(data, { optimistic: newData });
```

**Offline Support**:

```typescript
const store = getOfflineDataStore();
await store.set('key', data);
const cached = await store.get('key');
const pending = await store.getPendingSync();
```

## Phase 6: Farcaster Mini Apps & Memory Protocol

**Status**: ✅ Complete - Wallet-first integration with cross-platform identity

**Key Files**:

- `public/.well-known/farcaster.json` - Mini app manifest (JFS-signed)
- `src/utils/farcasterMiniApp.ts` - SDK integration, provider detection, chain switching
- `src/contexts/PlatformContext.tsx` - Unified platform detection (Farcaster, mobile, desktop, PWA)
- `src/services/memoryApi.ts` - Identity graphs, data upload, earnings tracking
- `src/hooks/useEnhancedProfile.ts` - Cross-platform profile resolution
- `src/components/challenges/SocialChallengeCreator.tsx` - Challenge creation with Memory Protocol
- `src/components/monetization/FitnessDataUploader.tsx` - Data monetization via Memory Protocol
- `src/app/api/miniapp/webhook/route.ts` - Mini app event handling

**Mini App Flow**:

```typescript
// User opens mini app in Farcaster
// → Auto-connects Farcaster wallet
// → Can submit score immediately (wallet-first)
// → Claims rewards on Base/Celo/Polygon
// → Optionally shares to Farcaster feed
// → Can monetize data via Memory Protocol
```

**Memory Protocol Integration**:

```typescript
// Resolve cross-platform identities
const client = getMemoryClient();
const identities = await client.getIdentityGraphByWallet('0x...');
// → Farcaster, Twitter, ENS, GitHub, Lens profiles

// Upload fitness data for monetization
await client.uploadFitnessData({
  userId: userAddress,
  dataType: 'structured',
  data: fitnessMetrics,
  metadata: { description, tags, quality },
});

// Track earnings
const earnings = await client.getEarnings(userAddress);
```

## Security

### NPM Supply Chain Protection

The project is protected against npm supply chain attacks:

- Dependencies are pinned via `pnpm-lock.yaml`
- Regular security audits with `pnpm audit`
- Safe versions confirmed for critical packages (chalk, debug)

### Age Configuration

For users experiencing age-related verification issues:

- Minimum age requirement: 18 years
- Age verification handled through Self Protocol
- Fallback mechanisms for edge cases

## Environment Setup

Copy environment files:

```sh
cp next/.env.example next/.env.local
```

Required environment variables documented in `.env.example`.
